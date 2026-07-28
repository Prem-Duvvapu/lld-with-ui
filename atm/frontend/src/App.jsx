import React, { useState } from 'react';
import AtmScreen from './components/AtmScreen';

export default function App() {
  const [screen, setScreen] = useState('insertCard');
  const [cardNumber, setCardNumber] = useState('');
  const [account, setAccount] = useState(null);

  const handleAuthenticated = (accountData) => {
    setAccount(accountData);
    setScreen('mainMenu');
  };

  const handleExit = () => {
    setAccount(null);
    setCardNumber('');
    setScreen('insertCard');
  };

  return (
    <div className="atm-machine">
      <div className="atm-screen">
        <div className="atm-title">ATM</div>
        <AtmScreen
          screen={screen}
          setScreen={setScreen}
          cardNumber={cardNumber}
          setCardNumber={setCardNumber}
          account={account}
          onAuthenticated={handleAuthenticated}
          onExit={handleExit}
        />
      </div>
    </div>
  );
}