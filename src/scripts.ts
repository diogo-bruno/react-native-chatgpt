export const ScriptGetScriptStartConversation = (message: string) => {
  const script = `function __generateUUID() {
    var d = new Date().getTime();
    var d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  
  function __startConversation() {
    const accessToken = JSON.parse(document.querySelector('body pre').innerText).accessToken;
    const hash = __generateUUID();
    const body = {
      action: 'next',
      messages: [
        {
          id: hash,
          author: { role: 'user' },
          content: { content_type: 'text', parts: ['${message}'] },
          metadata: {},
        },
      ],
      parent_message_id: '',
      model: 'text-davinci-002-render-sha',
      timezone_offset_min: 180,
      history_and_training_disabled: false,
      arkose_token: null,
    };
  
    fetch('https://chat.openai.com/backend-api/conversation', {
      headers: {
        accept: 'text/event-stream',
        'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        authorization: 'Bearer ' + accessToken,
        'content-type': 'application/json',
        'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        Referer: 'https://chat.openai.com/?model=text-davinci-002-render-sha',
        'Referrer-Policy': 'same-origin',
      },
      body: JSON.stringify(body),
      method: 'POST',
    }).then(async (res) => {
      try {
        const reader = res.body.getReader();
        let dataBody = undefined;
        let final = false;
        while (!final) {
          const { done, value } = await reader.read();
          dataBody = new TextDecoder().decode(value);
          window.ReactNativeWebView.postMessage(dataBody);
          if (done) {
            reader.releaseLock();
            final = true;
          }
        }
      } catch (error) {
        console.error(error);
      }
    });
  }
  
  __startConversation();
  `;
  return script;
};

export const ScriptCheckLogged = () => {
  return `if (document.querySelector('body pre')?.innerText === '{}') {
    window.ReactNativeWebView.postMessage(JSON.stringify({ logged: false }));
  } else if (document.querySelector('body pre')?.innerText ? JSON.parse(document.querySelector('body pre')?.innerText).accessToken : false) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ logged: true, login: true }));
  }
  `;
};

export const ScriptLoginFinished = () => {
  return `function _displayNone() {
    if (
      window.location.pathname !== '/auth/login' &&
      document.querySelector('#__next')
    )
      document.querySelector('#__next').style.display = 'none';
  }
  _displayNone();
  if (typeof ___scriptInterval !== 'undefined') clearInterval(___scriptInterval);
  var ___scriptInterval = setInterval(() => {
    _displayNone();
    //window.ReactNativeWebView.postMessage(JSON.stringify({ consoleLog: document.querySelector('#prompt-textarea') }));
    if (document.querySelector('#prompt-textarea')) {
      window.ReactNativeWebView.postMessage(JSON.stringify({logged: true, login: true}));
    }
  }, 500);
  `;
};

export const ScriptCheckLoginStartConversation = () => {
  return `if (document.querySelector('body pre')?.innerText === '{}') {
    window.ReactNativeWebView.postMessage(JSON.stringify({ startConversation: false }));
  } else if (document.querySelector('body pre')?.innerText ? JSON.parse(document.querySelector('body pre')?.innerText).accessToken : false) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ startConversation: true }));
  }
  `;
};

export const ScriptLogout = () => {
  return `window.location.assign('https://chat.openai.com/auth/logout'); window.location.href = 'https://chat.openai.com/auth/logout'`;
};

export const ScriptCheckLogout = () => {
  return `if (document.querySelector('body pre')?.innerText ? JSON.parse(document.querySelector('body pre').innerText).accessToken : false) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ logged: true, logout: true }));
  } else if (!document.querySelector('body pre') || !document.querySelector('body pre')?.innerText || document.querySelector('body pre')?.innerText === '{}') {
    window.ReactNativeWebView.postMessage(JSON.stringify({ logged: false, logout: true }));
  }
  `;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
