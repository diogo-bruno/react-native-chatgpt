# React Native ChatGPT

<div style="text-align: center">
<img src="https://github.com/diogo-bruno/react-native-chatgpt/assets/11491923/fdeee84a-9784-4c90-90ac-331d4de47d35" width="550" />
</div>

<p style="text-align: center">
The "react-native-chatgpt" plugin provides an API with the real functionality of ChatGPT web. The user will log directly into ChatGPT
</p>

# Example

```ssh
npm install https://github.com/diogo-bruno/react-native-chatgpt.git
```

```javascript
import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import ChatGPT, { ChatGPTRef } from 'react-native-chatgpt';

export default function Component() {
  const refChatGPT = React.useRef<ChatGPTRef>(null);

  const getTextInput = async (): Promise<string> => {
    return new Promise((resolve) => {
      Alert.prompt('Search', 'Type something', [{ text: 'OK', onPress: (value) => resolve(`${value}`) }], 'plain-text');
    });
  };

  return (
    <>
      <View style={styles.container}>
        <ChatGPT ref={refChatGPT} />
        <Button
          onPress={async () => {
            const response = await refChatGPT.current?.loginChatGPT();
            Alert.alert(`login: ${response}`);
          }}
          title="Login"
        />
        <Button
          onPress={async () => {
            const response = await refChatGPT.current?.logoutChatGPT();
            Alert.alert(`logout: ${response}`);
          }}
          title="Logout"
        />
        <Button
          onPress={async () => {
            const search = await getTextInput();
            if (search) {
              const message = await refChatGPT.current?.getResponse(`${search}`, (data: string) => {
                console.log('onProgress:', data);
              });
              Alert.alert(`response: ${message}`);
            }
          }}
          title="Search answer"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
```
