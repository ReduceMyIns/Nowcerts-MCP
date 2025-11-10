import React from 'react';
import ChatBot from 'react-simple-chatbot';
import { ThemeProvider } from 'styled-components';

const theme = {
  background: '#f5f8fb',
  fontFamily: 'Helvetica Neue',
  headerBgColor: '#6e48aa',
  headerFontColor: '#fff',
  headerFontSize: '15px',
  botBubbleColor: '#6e48aa',
  botFontColor: '#fff',
  userBubbleColor: '#fff',
  userFontColor: '#4a4a4a',
};

const steps = [
  {
    id: '1',
    message: 'Hello! How can I help you today?',
    trigger: '2',
  },
  {
    id: '2',
    options: [
      { value: 'policy-lookup', label: 'Look up my policy', trigger: 'policy-lookup' },
      { value: 'new-business', label: 'Apply for a new policy', trigger: 'new-business' },
      { value: 'service-request', label: 'Request a policy change', trigger: 'service-request' },
      { value: 'coi', label: 'Get a Certificate of Insurance', trigger: 'coi' },
    ],
  },
  {
    id: 'policy-lookup',
    message: 'To look up your policy, please log in to your account. You can view your policies on your dashboard.',
    trigger: '2',
  },
  {
    id: 'new-business',
    message: 'You can start a new business application by visiting our "Quotes" page.',
    trigger: '2',
  },
  {
    id: 'service-request',
    message: 'To request a policy change, please log in and go to the "Policy Service" section.',
    trigger: '2',
  },
  {
    id: 'coi',
    message: 'You can request a Certificate of Insurance from your client dashboard after logging in.',
    trigger: '2',
  },
];

function Chatbot() {
  return (
    <ThemeProvider theme={theme}>
      <ChatBot
        steps={steps}
        floating={true}
        headerTitle="ReduceMyInsurance.Net Assistant"
      />
    </ThemeProvider>
  );
}

export default Chatbot;
