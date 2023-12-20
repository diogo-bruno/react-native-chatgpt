const ScriptGetAccessToken = () => {
  return `function getAccessToken(callback) {
    function createSession() {
      fetch('https://chat.openai.com/api/auth/session')
        .then((response) => response.json())
        .then((data) => {
          if (data && data.accessToken) {
            localStorage.setItem('session', JSON.stringify(data));
            callback(data.accessToken);
          }
        });
    }
    const currentSession = JSON.parse(localStorage.getItem('session'));
    if (currentSession && currentSession?.accessToken && currentSession?.expires) {
      const expirationDate = new Date(currentSession.expires).setDate(new Date(currentSession.expires).getDate() - 5);
      if (expirationDate > new Date().getTime()) {
        callback(currentSession.accessToken);
      } else {
        createSession();
      }
    } else {
      createSession();
    }
  }`;
};

export const ScriptGetScriptStartConversation = (message: string) => {
  const script = `
  ${ScriptGetAccessToken()}
  
  function __generateUUID() {
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
  
  function __startConversation(accessToken) {
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
          clearTimeout(___scriptConversationTimeout);
          window.ReactNativeWebView.postMessage(JSON.stringify({ conversation: dataBody }));
          if (done) {
            reader.releaseLock();
            final = true;
          }
        }
      } catch (error) {
        console.error(error);
        window.ReactNativeWebView.postMessage(JSON.stringify({ errorConversation: JSON.stringify(error) }));
      }
    });
  }
  
  getAccessToken((accessToken) => {
    __startConversation(accessToken);
  });

  var ___scriptConversationTimeout = setTimeout(() => {
    window.ReactNativeWebView.postMessage(JSON.stringify({ errorConversation: 'Timeout occurred' }));
  }, 90*1000)
  
  `;
  return script;
};

export const ScriptCheckLogged = () => {
  return `
  ${ScriptGetAccessToken()}
  
  getAccessToken((accessToken) => {
    if (accessToken) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ logged: true, login: true }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({ logged: false }));
    }
  });
  
  `;
};

export const ScriptLoginFinished = () => {
  return `
  function _displayNone() {
    if (window.location.pathname !== '/auth/login' && document.querySelector('#__next')) document.querySelector('#__next').style.display = 'none';
  }
  _displayNone();
  
  if (typeof ___scriptInterval !== 'undefined') clearInterval(___scriptInterval);
  
  var ___scriptInterval = setInterval(() => {
    _displayNone();
    if (document.querySelector('#prompt-textarea')) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ logged: true, login: true }));
    }
  }, 500);
  
  `;
};

export const ScriptCheckLoginStartConversation = () => {
  return `
  ${ScriptGetAccessToken()}

  getAccessToken((accessToken) => {
    if (accessToken) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ startConversation: true }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({ startConversation: false }));
    }
  });
  `;
};

export const ScriptLogout = () => {
  return `function deleteAllCookies() {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }
  deleteAllCookies(); 
  window.location.assign('https://chat.openai.com/auth/logout'); 
  window.location.href = 'https://chat.openai.com/auth/logout'`;
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
