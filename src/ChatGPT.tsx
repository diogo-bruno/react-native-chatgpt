import React, { forwardRef, useImperativeHandle } from 'react';
import { Dimensions, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  ScriptCheckLogged,
  ScriptCheckLoginStartConversation,
  ScriptCheckLogout,
  ScriptGetScriptStartConversation,
  ScriptLoginFinished,
  ScriptLogout,
  sleep,
} from './scripts';

export interface ChatGPTRef {
  getResponse: (message: string, onProgress: (value: string) => void) => Promise<{ error: boolean; message: string; data: string }>;
  isLogged: () => Promise<boolean>;
  loginChatGPT: () => Promise<{ error: boolean; message: string }>;
  logoutChatGPT: () => Promise<{ error: boolean; message: string }>;
}

interface ChatGPTProps {}

const originWhitelist = ['https://*'];
const userAgent =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.166 Mobile Safari/537.36';

const JSONtryParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const urlChatGpt = 'https://chat.openai.com/';

const ChatGPT = forwardRef((props: ChatGPTProps, ref: any) => {
  const [webviewAuthSession, setWebviewAuthSession] = React.useState<WebView | null>(null);
  const [webviewLogin, setWebviewLogin] = React.useState<WebView | null>(null);

  const [modalLogin, setModalLogin] = React.useState<boolean>(false);

  const [logged, setLogged] = React.useState<boolean | undefined>(undefined);

  const [messageConversation, setMessageConversation] = React.useState<string>('');

  const [conversationResolve, setConversationResolve] = React.useState<(value: { error: boolean; message: string; data: string }) => void>();

  const [conversationOnProgress, setConversationOnProgress] = React.useState<(value: string) => void>();

  const [loginResolve, setLoginResolve] = React.useState<(value: unknown) => void>();

  const [logoutResolve, setLogoutResolve] = React.useState<(value: unknown) => void>();

  const resetFunctionsConversation = () => {
    setConversationResolve(undefined);

    setConversationOnProgress(undefined);
  };

  const resetFunctionsLoginLogout = () => {
    setLoginResolve(undefined);
    setLogoutResolve(undefined);
  };

  React.useEffect(() => {
    resetFunctionsConversation();
    resetFunctionsLoginLogout();
  }, []);

  const messageSetLogged = (jsonData: any) => {
    if (jsonData.logged) {
      setLogged(true);
      setModalLogin(false);
      injectScriptConversation();
    } else {
      setLogged(false);
    }

    if (loginResolve && jsonData.login) {
      loginResolve(jsonData.logged);
      resetFunctionsLoginLogout();
    }

    if (logoutResolve && jsonData.logout) {
      logoutResolve({ error: false, message: 'Logout success' });
      resetFunctionsLoginLogout();
    }
  };

  const messageCheckLoginStartConversation = (jsonData: any) => {
    if (jsonData.startConversation) {
      injectScriptConversation();
    } else {
      setModalLogin(true);
    }
  };

  const messageResponseText = (data: any) => {
    if (`${data}`.startsWith('data:') && `${data}`.indexOf('{') > -1 && `${data}`.indexOf('data: [DONE]') === -1) {
      try {
        const validJsonStrings = data.split('\n').filter((str: string) => str.trim().startsWith('data:'));

        const jsonDataArray = validJsonStrings.map((str: string) => JSONtryParse(str.slice(5).trim()));

        jsonDataArray.forEach((jsonData: any) => {
          if (jsonData?.message?.content?.content_type === 'text' && jsonData?.message?.content?.parts) {
            const messageResponse = jsonData.message.content.parts[0];

            if (jsonData.message?.status === 'in_progress' && conversationOnProgress && messageResponse) {
              conversationOnProgress(messageResponse);
            }

            if (jsonData.message?.metadata?.is_complete && conversationResolve && messageResponse) {
              conversationResolve({ error: false, message: '', data: messageResponse });
              resetFunctionsConversation();
            }
          }
        });
      } catch (error) {
        console.log(error);
        if (conversationResolve) conversationResolve({ error: true, message: JSON.stringify(error), data: '' });
      }
    }
  };

  const messageRecived = (event: any) => {
    try {
      const dataJson = JSONtryParse(event.nativeEvent.data);

      if (dataJson && dataJson?.errorConversation) {
        if (conversationResolve) conversationResolve({ error: true, message: dataJson.errorConversation, data: '' });
        return;
      }

      if (dataJson && dataJson?.logged !== undefined) {
        messageSetLogged(dataJson);
        return;
      }

      if (dataJson && dataJson?.startConversation !== undefined) {
        messageCheckLoginStartConversation(dataJson);
        return;
      }

      if (dataJson && dataJson?.conversation !== undefined) {
        messageResponseText(dataJson.conversation);
      }
    } catch (error) {
      console.error(error);
      if (conversationResolve) conversationResolve({ error: true, message: JSON.stringify(error), data: '' });
    }
  };

  const injectScriptConversation = () => {
    if (messageConversation) webviewAuthSession?.injectJavaScript(ScriptGetScriptStartConversation(messageConversation));
  };

  const getResponse = () => {
    if (!logged) {
      setModalLogin(true);
      return;
    }

    webviewAuthSession?.injectJavaScript(ScriptCheckLoginStartConversation());
  };

  const loginChatGPT = () => {
    if (logged && loginResolve) {
      loginResolve({ error: false, message: 'Already logged' });
    } else if (!logged) {
      setModalLogin(true);
    }
  };

  const logoutChatGPT = async () => {
    try {
      resetFunctionsConversation();
      webviewAuthSession?.requestFocus();
      await sleep(500);
      webviewAuthSession?.injectJavaScript(ScriptLogout());
    } catch (error) {
      console.error(error);
      if (logoutResolve) logoutResolve({ error: true, message: JSON.stringify(error) });
    }
  };

  useImperativeHandle(ref, () => ({
    isLogged: () => {
      return new Promise((resolve) => {
        webviewAuthSession?.requestFocus();

        while (!webviewAuthSession || logged === undefined) {
          sleep(100);
        }

        if (logged) resolve(true);
        else resolve(false);
      });
    },
    getResponse: (message: string, onProgress: (value: string) => void) => {
      return new Promise(async (resolve) => {
        if (!logged) {
          resolve({ error: true, message: 'Login required' });
          return;
        }

        setConversationResolve(() => (value: any) => resolve(value));

        setConversationOnProgress(() => (value: any) => onProgress(value));

        setMessageConversation(message);

        webviewAuthSession?.requestFocus();
        webviewAuthSession?.injectJavaScript(`window.location.href = '${urlChatGpt}';`);

        await sleep(500);

        getResponse();
      });
    },
    loginChatGPT: () => {
      return new Promise((resolve) => {
        if (logged) {
          resolve({ error: false, message: 'Already logged' });
          return;
        }

        setLoginResolve(() => (value: any) => resolve(value));

        loginChatGPT();
      });
    },
    logoutChatGPT: () => {
      return new Promise((resolve) => {
        if (!logged) {
          resolve({ error: false, message: 'Already not logged' });
          return;
        }

        setLogoutResolve(() => (value: any) => resolve(value));

        logoutChatGPT();
      });
    },
  }));

  return (
    <>
      <Modal
        presentationStyle="pageSheet"
        animationType="slide"
        visible={modalLogin}
        style={{ zIndex: 1100 }}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setModalLogin(false);
          if (conversationResolve) conversationResolve({ error: true, message: 'Login canceled', data: '' });
          if (loginResolve) loginResolve({ error: true, message: 'Login canceled' });
          resetFunctionsConversation();
        }}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Login ChatGPT</Text>
          <View style={styles.separator}></View>
          <WebView
            startInLoadingState={true}
            ref={setWebviewLogin}
            style={styles.container}
            source={{ uri: urlChatGpt }}
            onLoadEnd={() => webviewLogin?.injectJavaScript(ScriptLoginFinished())}
            onNavigationStateChange={() => {
              webviewLogin?.injectJavaScript(ScriptLoginFinished());
            }}
            onError={() => {
              if (conversationResolve) conversationResolve({ error: true, message: 'Error on chat.openai.com', data: '' });
              if (loginResolve) loginResolve({ error: true, message: 'Error on chat.openai.com' });
              resetFunctionsConversation();
            }}
            javaScriptEnabled={true}
            userAgent={userAgent}
            originWhitelist={originWhitelist}
            onMessage={messageRecived}
            webviewDebuggingEnabled={true}
          />
        </View>
      </Modal>

      <View style={styles.displayNone}>
        <WebView
          startInLoadingState={false}
          ref={setWebviewAuthSession}
          source={{
            uri: urlChatGpt,
          }}
          onLoadEnd={async () => {
            webviewAuthSession?.injectJavaScript(ScriptCheckLogged());
          }}
          onNavigationStateChange={(event) => {
            if (event.url === 'https://chat.openai.com/auth/login') webviewAuthSession?.injectJavaScript(ScriptCheckLogout());
          }}
          onError={() => {
            if (conversationResolve) conversationResolve({ error: true, message: 'Error on chat.openai.com', data: '' });
          }}
          javaScriptEnabled={true}
          userAgent={userAgent}
          originWhitelist={originWhitelist}
          onMessage={messageRecived}
          webviewDebuggingEnabled={true}
        />
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    zIndex: 1000,
  },
  title: {
    paddingTop: 20,
    paddingBottom: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#eee',
  },
  separator: {
    marginVertical: 0,
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  displayNone: {
    display: 'none',
  },
  container: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#000',
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default ChatGPT;
