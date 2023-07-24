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

  return (
    <>
      <View style={styles.container}>
        <ChatGPT ref={refChatGPT} />
        <Button
          onPress={() => {
            refChatGPT.current?.loginChatGPT();
          }}
          title="Login"
        />
        <Button
          onPress={() => {
            refChatGPT.current?.logoutChatGPT();
          }}
          title="Logout"
        />
        <Button
          onPress={async () => {
            const message = await refChatGPT.current?.getResponse('Hello', (data: string) => {
              console.log('onProgress: ', data);
            });
            console.log('messageResponse: ', message);
          }}
          title="Start conversation"
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
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
```
