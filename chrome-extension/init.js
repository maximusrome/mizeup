var user = localStorage.getItem('mizeup_user');
if (!user) {
  user = prompt('Enter your email for Mizeup:');
  if (user) localStorage.setItem('mizeup_user', user);
}

posthog.init('phc_dD0odqcDIFvV1W0fMEJ7u6eaWjB0pRhSGkYs7efFDca', {
  api_host: 'https://us.i.posthog.com',
  session_recording: { maskAllInputs: false },
  loaded: function(ph) {
    if (user) ph.identify(user);
    ph.startSessionRecording();
  }
});
