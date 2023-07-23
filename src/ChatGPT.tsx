import React, {forwardRef, useImperativeHandle} from 'react';
import {Dimensions, Modal, StyleSheet, Text, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {
  ScriptCheckLogged,
  ScriptCheckLoginStartConversation,
  ScriptGetScriptStartConversation,
  ScriptLoginFinished,
  ScriptLogout,
  sleep,
} from './scripts';

export interface ChatGPTRef {
  getResponse: (
    message: string,
    onProgress: (value: string) => void,
  ) => Promise<string>;
  loginChatGPT: () => void;
  logoutChatGPT: () => void;
}

interface ChatGPTProps {}

const originWhitelist = ['https://*', 'http://*', 'file://*', 'sms://*'];
const userAgent =
  'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko';

const JSONtryParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const ChatGPT = forwardRef((props: ChatGPTProps, ref) => {
  const [webviewAuthSession, setWebviewAuthSession] =
    React.useState<WebView | null>(null);
  const [webviewLogin, setWebviewLogin] = React.useState<WebView | null>(null);

  const [modalLogin, setModalLogin] = React.useState<boolean>(false);

  const [logged, setLogged] = React.useState<boolean | undefined>(undefined);

  const [messageConversation, setMessageConversation] =
    React.useState<string>('');

  const [conversationResolve, setConversationResolve] =
    React.useState<(value: unknown) => void>();
  const [conversationReject, setConversationReject] =
    React.useState<(reason?: any) => void>();
  const [conversationOnProgress, setConversationOnProgress] =
    React.useState<(value: string) => void>();

  const messageSetLogged = (data: string) => {
    if (/\{.*\}.*logged/i.test(data)) {
      const jsonData = JSONtryParse(data);
      if (jsonData?.logged) {
        setLogged(true);
        setModalLogin(false);
        injectScriptConversation();
      } else {
        setLogged(false);
      }
    }
  };

  const messageCheckLoginStartConversation = (data: string) => {
    if (/\{.*\}.*startConversation/i.test(data)) {
      const jsonData = JSONtryParse(data);
      if (jsonData?.startConversation) {
        injectScriptConversation();
      } else {
        setModalLogin(true);
      }
    }
  };

  const messageResponseText = (data: string) => {
    if (/^data:.*\{.*\}(?!.*data: \[DONE\])/i.test(data)) {
      const validJsonStrings = data
        .split('\n')
        .filter((str: string) => str.trim().startsWith('data:'));

      const jsonDataArray = validJsonStrings.map((str: string) =>
        JSONtryParse(str.slice(5).trim()),
      );

      jsonDataArray.forEach((jsonData: any) => {
        if (jsonData?.message?.content?.content_type === 'text') {
          const messageResponse = jsonData.message.content.parts[0];

          if (conversationOnProgress && messageResponse) {
            conversationOnProgress(messageResponse);
          }

          if (
            jsonData.message.metadata.is_complete &&
            conversationResolve &&
            messageResponse
          ) {
            conversationResolve(messageResponse);
          }
        }
      });
    }
  };

  const messageRecived = (event: any) => {
    try {
      const data = event.nativeEvent.data;

      messageSetLogged(data);

      messageCheckLoginStartConversation(data);

      messageResponseText(data);
    } catch (error) {
      console.error(error);
      if (conversationReject)
        conversationReject({error: JSON.stringify(error)});
    }
  };

  const injectScriptConversation = () => {
    if (messageConversation)
      webviewAuthSession?.injectJavaScript(
        ScriptGetScriptStartConversation(messageConversation),
      );
  };

  const getResponse = () => {
    if (!logged) {
      setModalLogin(true);
      return;
    }

    webviewAuthSession?.injectJavaScript(ScriptCheckLoginStartConversation());
  };

  const loginChatGPT = () => {
    setModalLogin(true);
  };

  const logoutChatGPT = async () => {
    webviewAuthSession?.requestFocus();
    await sleep(500);
    webviewAuthSession?.injectJavaScript(ScriptLogout());
    await sleep(2000);
    webviewAuthSession?.reload();
    return true;
  };

  const debugResponse = (
    resolve: Function,
    reject: Function,
    onProgress: Function,
  ) => {
    let b = 1;

    const a = setInterval(() => {
      onProgress(`##${b}`);
      b++;
    }, 100);

    setTimeout(() => {
      clearInterval(a);
      resolve({message: `debug - ${b}`});
    }, 5000);
  };

  useImperativeHandle(ref, () => ({
    getResponse: (message: string, onProgress: (value: string) => void) => {
      const debug = false;
      return new Promise((resolve, reject) => {
        setConversationResolve(() => (value: any) => resolve(value));
        setConversationReject(() => (value: any) => reject(value));
        setConversationOnProgress(() => (value: any) => onProgress(value));

        setMessageConversation(message);

        if (debug) {
          debugResponse(resolve, reject, onProgress);
        } else {
          getResponse();
        }
      });
    },
    loginChatGPT,
    logoutChatGPT,
  }));

  return (
    <>
      <Modal
        presentationStyle="pageSheet"
        visible={modalLogin}
        style={{zIndex: 1100}}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setModalLogin(false);
          if (conversationReject) conversationReject({error: 'Login canceled'});
        }}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Login ChatGPT</Text>
          <View style={styles.separator}></View>
          <WebView
            startInLoadingState={false}
            ref={setWebviewLogin}
            style={styles.container}
            source={{uri: `https://chat.openai.com/?${new Date().getTime()}`}}
            onLoadEnd={() =>
              webviewLogin?.injectJavaScript(ScriptLoginFinished())
            }
            javaScriptEnabled={true}
            userAgent={userAgent}
            originWhitelist={originWhitelist}
            onMessage={messageRecived}
          />
        </View>
      </Modal>

      <View style={styles.displayNone}>
        <WebView
          startInLoadingState={false}
          ref={setWebviewAuthSession}
          source={{
            uri: `https://chat.openai.com/api/auth/session?${new Date().getTime()}`,
          }}
          onLoadEnd={() =>
            webviewAuthSession?.injectJavaScript(ScriptCheckLogged())
          }
          javaScriptEnabled={true}
          userAgent={userAgent}
          originWhitelist={originWhitelist}
          onMessage={messageRecived}
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
