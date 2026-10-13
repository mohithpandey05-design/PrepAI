document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  const baseUrl = window.API_BASE_URL || '';
  const notify = (msg, type) =>
    (window.showToast ? window.showToast(msg, type || 'info') : alert(msg));

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const show = (el) => { if (el) el.classList.remove('hidden'); };
  const hide = (el) => { if (el) el.classList.add('hidden'); };

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (isInterviewActive && !window.confirm('Your interview is in progress. Leaving now will discard it. Log out anyway?')) return;
      isInterviewActive = false;
      // Otherwise the interviewer keeps talking over the login page: speech
      // synthesis outlives the navigation on Chrome.
      cancelSpeech();
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // =====================================================================
  // DOM References
  // =====================================================================

  // Views
  const startView = document.getElementById('startView');
  const deviceCheckView = document.getElementById('deviceCheckView');
  const interviewView = document.getElementById('interviewView');
  const reviewView = document.getElementById('reviewView');
  const completedView = document.getElementById('completedView');
  const reportView = document.getElementById('reportView');

  // Start screen
  const startInterviewBtn = document.getElementById('startInterviewBtn');
  const startRole = document.getElementById('startRole');
  const startQCount = document.getElementById('startQCount');
  const startDuration = document.getElementById('startDuration');
  const startRerecords = document.getElementById('startRerecords');
  const startInstrPrep = document.getElementById('startInstrPrep');
  const startInstrAnswer = document.getElementById('startInstrAnswer');
  const startInstrRerecord = document.getElementById('startInstrRerecord');
  const startInstrFollowUp = document.getElementById('startInstrFollowUp');

  // Device check
  const devicePreviewVideo = document.getElementById('devicePreviewVideo');
  const previewOverlay = document.getElementById('previewOverlay');
  const deviceMicBar = document.getElementById('deviceMicBar');
  const cameraSelect = document.getElementById('cameraSelect');
  const micSelect = document.getElementById('micSelect');
  const speakerSelect = document.getElementById('speakerSelect');
  const speakerSelectWrap = document.getElementById('speakerSelectWrap');
  const testSpeakerBtn = document.getElementById('testSpeakerBtn');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const voiceUnsupportedNotice = document.getElementById('voiceUnsupportedNotice');
  const speakerHeardCheck = document.getElementById('speakerHeardCheck');
  const cameraStatus = document.getElementById('cameraStatus');
  const micStatusEl = document.getElementById('micStatus');
  const speakerStatusEl = document.getElementById('speakerStatus');
  const permissionRetry = document.getElementById('permissionRetry');
  const permissionRetryText = document.getElementById('permissionRetryText');
  const retryPermissionBtn = document.getElementById('retryPermissionBtn');
  const sttNotice = document.getElementById('sttNotice');
  const beginInterviewBtn = document.getElementById('beginInterviewBtn');
  const beginGateHint = document.getElementById('beginGateHint');

  // Interview screen
  const interviewVideo = document.getElementById('interviewVideo');
  const recIndicator = document.getElementById('recIndicator');
  const prepOverlay = document.getElementById('prepOverlay');
  const prepTimer = document.getElementById('prepTimer');
  const prepOverlayLabel = document.getElementById('prepOverlayLabel');
  const prepOverlayHint = document.getElementById('prepOverlayHint');
  const prepActionHint = document.getElementById('prepActionHint');
  const camStatusIcon = document.getElementById('camStatusIcon');
  const micStatusIcon = document.getElementById('micStatusIcon');
  const answerTimerContainer = document.getElementById('answerTimerContainer');
  const answerTimer = document.getElementById('answerTimer');
  const interviewProgressFill = document.getElementById('interviewProgressFill');
  const questionNumber = document.getElementById('questionNumber');
  const questionCategory = document.getElementById('questionCategory');
  const questionText = document.getElementById('questionText');
  const questionInstructions = document.getElementById('questionInstructions');
  const metaPrepTime = document.getElementById('metaPrepTime');
  const metaAnswerTime = document.getElementById('metaAnswerTime');
  const actionPrep = document.getElementById('actionPrep');
  const actionRecording = document.getElementById('actionRecording');
  const skipPrepBtn = document.getElementById('skipPrepBtn');
  const finishAnswerBtn = document.getElementById('finishAnswerBtn');

  // Interviewer voice
  const interviewerBar = document.getElementById('interviewerBar');
  const interviewerLabel = document.getElementById('interviewerLabel');
  const repeatQuestionBtn = document.getElementById('repeatQuestionBtn');
  const muteVoiceBtn = document.getElementById('muteVoiceBtn');
  const followUpNote = document.getElementById('followUpNote');
  const followUpNoteText = document.getElementById('followUpNoteText');

  // Review screen
  const reviewPlayer = document.getElementById('reviewPlayer');
  const reviewQuestionText = document.getElementById('reviewQuestionText');
  const reviewTranscript = document.getElementById('reviewTranscript');
  const rerecordBtn = document.getElementById('rerecordBtn');
  const rerecordCount = document.getElementById('rerecordCount');
  const confirmAnswerBtn = document.getElementById('confirmAnswerBtn');
  const reviewSubmitError = document.getElementById('reviewSubmitError');

  // Completed screen
  const completedQCount = document.getElementById('completedQCount');
  const completedDuration = document.getElementById('completedDuration');
  const viewReportBtn = document.getElementById('viewReportBtn');

  // =====================================================================
  // State
  // =====================================================================
  let activeSessionId = null;
  let questions = [];
  let currentQuestionIndex = 0;
  let maxRerecords = 2;          // replaced by the server value once known
  let rerecordsLeft = 2;
  let rerecordsUsed = 0;
  let answeredCount = 0;
  let maxFollowUps = 3;          // replaced by the server value once known
  let totalMainQuestions = 0;    // planned questions, excluding any probes
  // Invalidates the pending "finished speaking" callback when the candidate has
  // already moved on, so a late callback cannot start a countdown for a
  // question that is no longer on screen.
  let loadToken = 0;

  // Media
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordedBlob = null;
  let recordedUrl = null;        // object URL currently held by the review player
  let recordingStoppedPromise = null;
  let answerElapsedSeconds = 0;
  let answerStartedAt = null;
  let isFinishingAnswer = false;

  // Speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let currentTranscript = '';

  // Interviewer voice (speech synthesis)
  const synth = window.speechSynthesis || null;
  const voiceSupported = Boolean(synth && window.SpeechSynthesisUtterance);
  const VOICE_MUTE_KEY = 'interviewVoiceMuted';
  let voiceMuted = localStorage.getItem(VOICE_MUTE_KEY) === '1';
  let preferredVoice = null;
  let currentUtterance = null;
  let speechWatchdog = null;
  let isSpeaking = false;
  // The step waiting on the interviewer to finish reading. Held separately so
  // muting mid-sentence can run it immediately instead of stranding the flow.
  let pendingAfterSpeech = null;

  // Audio analysis + speaker test
  let audioContext = null;
  let analyser = null;
  let micSource = null;
  let animFrameId = null;
  let testAudioEl = null;

  // Device readiness
  let cameraReady = false;
  let micReady = false;
  let speakerConfirmed = false;

  // Timers
  let prepInterval = null;
  let answerInterval = null;
  let interviewStartTime = null;
  let isInterviewActive = false;

  // =====================================================================
  // Utility
  // =====================================================================
  function showView(viewEl) {
    [startView, deviceCheckView, interviewView, reviewView, completedView, reportView].forEach(v => {
      if (v) v.classList.add('hidden');
    });
    if (viewEl) viewEl.classList.remove('hidden');
  }

  function formatTime(seconds) {
    const safe = Math.max(0, seconds);
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function describeSeconds(seconds) {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds} seconds`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (s === 0) return m === 1 ? '1 minute' : `${m} minutes`;
    return `${m} min ${s} sec`;
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    if (btnText) btnText.classList.toggle('hidden', busy);
    if (spinner) spinner.classList.toggle('hidden', !busy);
    btn.disabled = busy;
  }

  function releaseRecordedUrl() {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      recordedUrl = null;
    }
  }

  // =====================================================================
  // INTERVIEWER VOICE
  //
  // The interviewer reads each question aloud once and then stops. It never
  // responds to the candidate and never speaks while the microphone is live —
  // otherwise its own voice would land in the recording and the transcript.
  // =====================================================================

  // Browser default voices vary wildly in quality; these are the ones that
  // sound like a person rather than a 1990s screen reader.
  const VOICE_PREFERENCES = [
    'Google US English', 'Microsoft Aria', 'Microsoft Guy', 'Microsoft Jenny',
    'Samantha', 'Karen', 'Daniel', 'Google UK English Female', 'Google UK English Male'
  ];

  function pickVoice() {
    if (!voiceSupported) return null;
    const voices = synth.getVoices();
    if (!voices || !voices.length) return null;

    for (const name of VOICE_PREFERENCES) {
      const match = voices.find(v => v.name === name);
      if (match) return match;
    }
    return voices.find(v => /^en[-_]/i.test(v.lang) && v.localService)
      || voices.find(v => /^en[-_]/i.test(v.lang))
      || voices[0];
  }

  if (voiceSupported) {
    preferredVoice = pickVoice();
    // Chrome populates the voice list asynchronously, so the first call above
    // usually returns nothing on a cold load.
    synth.addEventListener('voiceschanged', () => {
      if (!preferredVoice) preferredVoice = pickVoice();
    });
  }

  function setSpeakingUi(speaking) {
    isSpeaking = speaking;
    if (interviewerBar) interviewerBar.classList.toggle('is-speaking', speaking);
    if (interviewerLabel) {
      interviewerLabel.textContent = speaking ? 'Interviewer is speaking…' : 'AI Interviewer';
    }
    // Replaying mid-recording would put the interviewer's voice into the answer.
    if (repeatQuestionBtn) repeatQuestionBtn.disabled = speaking;
  }

  function cancelSpeech() {
    if (speechWatchdog) {
      clearTimeout(speechWatchdog);
      speechWatchdog = null;
    }
    if (currentUtterance) {
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance = null;
    }
    if (voiceSupported) {
      try { synth.cancel(); } catch (e) { /* nothing pending */ }
    }
    setSpeakingUi(false);
  }

  /**
   * Read text aloud, then invoke onDone exactly once.
   *
   * onDone always fires — muted, unsupported, errored or cut short — because the
   * interview flow waits on it before starting the preparation clock.
   */
  function speak(text, onDone) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (speechWatchdog) { clearTimeout(speechWatchdog); speechWatchdog = null; }
      currentUtterance = null;
      pendingAfterSpeech = null;
      setSpeakingUi(false);
      if (typeof onDone === 'function') onDone();
    };

    cancelSpeech();
    pendingAfterSpeech = typeof onDone === 'function' ? finish : null;

    if (!voiceSupported || voiceMuted || !text) {
      // Defer so callers see the same asynchronous behaviour either way.
      setTimeout(finish, 0);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      if (!preferredVoice) preferredVoice = pickVoice();
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      }
      // Slightly under normal pace: interview questions are dense and the
      // candidate is hearing each one for the first time.
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = finish;
      utterance.onerror = finish;

      currentUtterance = utterance;
      setSpeakingUi(true);

      // Chrome intermittently never fires onend on long utterances. Without a
      // ceiling the candidate would sit on a frozen screen forever.
      const estimateMs = Math.round((text.length / 12) * 1000) + 4000;
      speechWatchdog = setTimeout(finish, estimateMs);

      synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
      finish();
    }
  }

  function applyMuteUi() {
    if (!muteVoiceBtn) return;
    const icon = muteVoiceBtn.querySelector('i');
    if (icon) icon.className = voiceMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
    muteVoiceBtn.setAttribute('aria-pressed', voiceMuted ? 'true' : 'false');
    muteVoiceBtn.title = voiceMuted
      ? 'Unmute the interviewer\'s voice'
      : 'Mute the interviewer\'s voice';
    muteVoiceBtn.classList.toggle('is-muted', voiceMuted);
  }
  applyMuteUi();

  if (muteVoiceBtn) {
    muteVoiceBtn.addEventListener('click', () => {
      voiceMuted = !voiceMuted;
      localStorage.setItem(VOICE_MUTE_KEY, voiceMuted ? '1' : '0');
      applyMuteUi();

      if (voiceMuted) {
        // Muting mid-sentence must not strand the candidate waiting for the
        // interviewer to finish, so treat it as the question having been read.
        const wasSpeaking = isSpeaking;
        cancelSpeech();
        if (wasSpeaking && pendingAfterSpeech) {
          const resume = pendingAfterSpeech;
          pendingAfterSpeech = null;
          resume();
        }
      } else {
        notify('The interviewer will read the next question aloud.', 'info');
      }
    });
  }

  if (repeatQuestionBtn) {
    repeatQuestionBtn.addEventListener('click', () => {
      const q = questions[currentQuestionIndex];
      if (!q) return;
      if (voiceMuted) {
        notify('The interviewer\'s voice is muted. Unmute it to hear the question.', 'info');
        return;
      }
      // The preparation clock keeps running: listening again is the candidate's
      // choice about how to spend that time.
      speak(q.question);
    });
  }

  // =====================================================================
  // Prevent accidental navigation during interview
  // =====================================================================
  window.addEventListener('beforeunload', (e) => {
    if (isInterviewActive) {
      e.preventDefault();
      e.returnValue = 'You have an active interview in progress. Are you sure you want to leave?';
    }
  });

  // Warn before following an in-app link mid-interview.
  document.querySelectorAll('a[href]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (!isInterviewActive) return;
      if (link.getAttribute('href').startsWith('#')) return;
      if (!window.confirm('Your interview is in progress. Leaving now will discard it. Continue?')) {
        e.preventDefault();
      } else {
        isInterviewActive = false;
        cancelSpeech();
      }
    });
  });

  // =====================================================================
  // START SCREEN — real interview metadata, fetched before anything starts
  // =====================================================================
  async function loadIntro() {
    try {
      const res = await fetch(`${baseUrl}/api/interview/intro`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // An expired or revoked token would otherwise leave the candidate on a
      // start screen full of placeholders until they pressed Start Interview.
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.intro) return;

      const intro = data.intro;
      maxRerecords = Number.isInteger(intro.maxRerecords) ? intro.maxRerecords : maxRerecords;
      maxFollowUps = Number.isInteger(intro.maxFollowUps) ? intro.maxFollowUps : maxFollowUps;

      if (startRole) startRole.textContent = intro.role || 'Software Engineer';
      if (startQCount) {
        // Probes are conditional, so the count is stated as a range rather than
        // a promise the interview might not keep.
        startQCount.textContent = maxFollowUps > 0
          ? `${intro.totalQuestions || '—'}+`
          : String(intro.totalQuestions || '—');
      }
      if (startDuration) startDuration.textContent = `~${intro.estimatedMinutes || 15} min`;
      if (startRerecords) {
        startRerecords.textContent = String(maxRerecords);
      }

      if (startInstrPrep) {
        const lo = intro.prepSecondsMin, hi = intro.prepSecondsMax;
        startInstrPrep.textContent = lo && hi
          ? (lo === hi
              ? `You get ${lo} seconds to prepare before each question — nothing is recorded during that time.`
              : `You get ${lo}–${hi} seconds to prepare before each question — nothing is recorded during that time.`)
          : startInstrPrep.textContent;
      }
      if (startInstrAnswer) {
        const lo = intro.answerSecondsMin, hi = intro.answerSecondsMax;
        startInstrAnswer.textContent = lo && hi
          ? (lo === hi
              ? `Each answer may run up to ${describeSeconds(lo)}; recording stops automatically at the limit.`
              : `Each answer may run up to ${describeSeconds(lo)}–${describeSeconds(hi)} depending on the question; recording stops automatically at the limit.`)
          : startInstrAnswer.textContent;
      }
      if (startInstrRerecord) {
        startInstrRerecord.textContent = maxRerecords > 0
          ? `You can review each answer and re-record it up to ${maxRerecords} time${maxRerecords === 1 ? '' : 's'}.`
          : 'You can review each answer before confirming it.';
      }
      if (startInstrFollowUp) {
        startInstrFollowUp.textContent = maxFollowUps > 0
          ? `The interviewer may ask up to ${maxFollowUps} follow-up question${maxFollowUps === 1 ? '' : 's'}, based on what you actually said in an earlier answer.`
          : 'Every question is prepared in advance from your profile and the role.';
      }
    } catch (e) {
      // Start screen keeps its neutral placeholders; the real values still
      // arrive with the session when the interview starts.
      console.warn('Could not load interview intro:', e);
    }
  }
  loadIntro();

  if (startInterviewBtn) {
    startInterviewBtn.addEventListener('click', async () => {
      setBusy(startInterviewBtn, true);

      try {
        const res = await fetch(`${baseUrl}/api/interview/start`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (res.ok && data.sessionId) {
          activeSessionId = data.sessionId;
          // serverIndex addresses the question row on the backend; the array
          // position is only for display, because follow-ups get spliced in
          // next to their parent while the backend appends them at the end.
          questions = (data.questions || []).map((q, i) => ({
            ...q,
            serverIndex: Number.isInteger(q.index) ? q.index : i,
            mainNumber: i + 1,
            isFollowUp: false
          }));
          totalMainQuestions = questions.length;
          if (Number.isInteger(data.maxRerecords)) maxRerecords = data.maxRerecords;
          if (Number.isInteger(data.maxFollowUps)) maxFollowUps = data.maxFollowUps;

          if (startRole) startRole.textContent = data.selectedRole || 'Software Engineer';
          if (startQCount) {
            startQCount.textContent = maxFollowUps > 0 ? `${questions.length}+` : String(questions.length);
          }
          if (startDuration) startDuration.textContent = `~${data.estimatedDuration || 15} min`;

          showView(deviceCheckView);
          await initDeviceCheck();
        } else {
          notify(data.message || 'Failed to start the interview.', 'error');
        }
      } catch (e) {
        console.error(e);
        notify('Network error starting the interview.', 'error');
      } finally {
        setBusy(startInterviewBtn, false);
      }
    });
  }

  // =====================================================================
  // DEVICE CHECK — camera, microphone and speaker
  // =====================================================================
  async function initDeviceCheck() {
    hide(permissionRetry);

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      if (devicePreviewVideo) devicePreviewVideo.srcObject = mediaStream;
      if (previewOverlay) previewOverlay.classList.add('is-hidden');

      watchTracks(mediaStream);
      await enumerateDevices();
      startMicMeter(mediaStream, deviceMicBar);

    } catch (err) {
      console.error('Device access error:', err);
      cameraReady = false;
      micReady = false;
      if (previewOverlay) previewOverlay.classList.remove('is-hidden');

      const messages = {
        NotAllowedError: 'Camera and microphone access was blocked. Allow access in your browser\'s address bar, then try again.',
        NotFoundError: 'No camera or microphone was found. Connect a device and try again.',
        NotReadableError: 'Your camera or microphone is already in use by another application. Close it and try again.',
        OverconstrainedError: 'The selected camera does not support the required video settings. Try a different camera.'
      };
      const message = messages[err.name] || 'We could not access your camera and microphone. Check your device settings and try again.';

      setDeviceStatus(cameraStatus, false, err.name === 'NotAllowedError' ? 'Camera access denied' : 'Camera not available');
      setDeviceStatus(micStatusEl, false, err.name === 'NotAllowedError' ? 'Microphone access denied' : 'Microphone not available');
      if (permissionRetryText) permissionRetryText.textContent = message;
      show(permissionRetry);
      notify(message, 'error');
      refreshDeviceGate();
    }

    // Automatic transcription is what makes the answer scoreable; say so up
    // front rather than after the candidate has recorded seven answers.
    if (sttNotice) sttNotice.classList.toggle('hidden', Boolean(SpeechRecognition));

    // The questions are read aloud, so a browser without speech synthesis is
    // worth flagging here rather than at the first silent question.
    if (voiceUnsupportedNotice) voiceUnsupportedNotice.classList.toggle('hidden', voiceSupported);
    if (testVoiceBtn) testVoiceBtn.disabled = !voiceSupported;
  }

  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      if (!voiceSupported) return;
      // A sample in the interviewer's own voice: the point of the check is that
      // the candidate can hear *this*, not just a tone.
      const wasMuted = voiceMuted;
      if (wasMuted) {
        voiceMuted = false;
        localStorage.setItem(VOICE_MUTE_KEY, '0');
        applyMuteUi();
        notify('The interviewer\'s voice has been unmuted for the test.', 'info');
      }
      testVoiceBtn.disabled = true;
      speak(
        'Hello. I will be your interviewer today. I will read each question aloud, then you record your answer.',
        () => { testVoiceBtn.disabled = false; }
      );
    });
  }

  if (retryPermissionBtn) {
    retryPermissionBtn.addEventListener('click', async () => {
      retryPermissionBtn.disabled = true;
      await initDeviceCheck();
      retryPermissionBtn.disabled = false;
    });
  }

  /**
   * Drive the camera/mic indicators from the actual track state, so unplugging
   * a webcam mid-interview is reflected instead of showing a stale "connected".
   */
  function watchTracks(stream) {
    const videoTrack = stream.getVideoTracks()[0] || null;
    const audioTrack = stream.getAudioTracks()[0] || null;

    cameraReady = Boolean(videoTrack && videoTrack.readyState === 'live');
    micReady = Boolean(audioTrack && audioTrack.readyState === 'live');

    const bind = (track, onChange) => {
      if (!track) return;
      track.addEventListener('ended', onChange);
      track.addEventListener('mute', onChange);
      track.addEventListener('unmute', onChange);
    };

    bind(videoTrack, () => {
      cameraReady = videoTrack.readyState === 'live' && !videoTrack.muted;
      syncDeviceIndicators();
    });
    bind(audioTrack, () => {
      micReady = audioTrack.readyState === 'live' && !audioTrack.muted;
      syncDeviceIndicators();
    });

    syncDeviceIndicators();
  }

  function syncDeviceIndicators() {
    setDeviceStatus(cameraStatus, cameraReady, cameraReady ? 'Camera connected' : 'Camera not available');
    setDeviceStatus(micStatusEl, micReady, micReady ? 'Microphone connected' : 'Microphone not available');
    if (camStatusIcon) camStatusIcon.classList.toggle('is-active', cameraReady);
    if (micStatusIcon) micStatusIcon.classList.toggle('is-active', micReady);
    if (previewOverlay) previewOverlay.classList.toggle('is-hidden', cameraReady);
    refreshDeviceGate();

    if (isInterviewActive && (!cameraReady || !micReady)) {
      notify('Your camera or microphone stopped. Reconnect the device to continue recording.', 'error');
    }
  }

  function setDeviceStatus(el, connected, text) {
    if (!el) return;
    el.classList.toggle('is-connected', connected);
    const span = el.querySelector('span');
    if (span) span.textContent = text;
    const icon = el.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-circle-check', connected);
      icon.classList.toggle('fa-circle-xmark', !connected);
    }
  }

  function refreshDeviceGate() {
    const ready = cameraReady && micReady && speakerConfirmed;
    if (beginInterviewBtn) beginInterviewBtn.disabled = !ready;
    if (beginGateHint) beginGateHint.classList.toggle('hidden', ready);
  }

  async function enumerateDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const fill = (selectEl, list, labelPrefix) => {
        if (!selectEl) return;
        const previous = selectEl.value;
        selectEl.innerHTML = '';
        list.forEach((d, i) => {
          const opt = document.createElement('option');
          opt.value = d.deviceId;
          opt.textContent = d.label || `${labelPrefix} ${i + 1}`;
          selectEl.appendChild(opt);
        });
        if (previous && list.some(d => d.deviceId === previous)) selectEl.value = previous;
        // A single device is nothing to choose between.
        selectEl.disabled = list.length <= 1;
      };

      fill(cameraSelect, devices.filter(d => d.kind === 'videoinput'), 'Camera');
      fill(micSelect, devices.filter(d => d.kind === 'audioinput'), 'Microphone');

      const outputs = devices.filter(d => d.kind === 'audiooutput');
      // Output selection only exists where setSinkId is implemented.
      const canPickOutput = outputs.length > 0 && typeof HTMLMediaElement.prototype.setSinkId === 'function';
      if (speakerSelectWrap) speakerSelectWrap.classList.toggle('hidden', !canPickOutput);
      if (canPickOutput) fill(speakerSelect, outputs, 'Speaker');
    } catch (e) {
      console.warn('Device enumeration error:', e);
    }
  }

  if (cameraSelect) cameraSelect.addEventListener('change', switchDevice);
  if (micSelect) micSelect.addEventListener('change', switchDevice);
  if (speakerSelect) {
    speakerSelect.addEventListener('change', () => {
      // The new output is unverified until the candidate hears it.
      speakerConfirmed = false;
      if (speakerHeardCheck) speakerHeardCheck.checked = false;
      setDeviceStatus(speakerStatusEl, false, 'Speaker not confirmed');
      refreshDeviceGate();
    });
  }

  async function switchDevice() {
    try {
      stopMicMeter();
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());

      const constraints = {
        video: {
          deviceId: cameraSelect && cameraSelect.value ? { exact: cameraSelect.value } : undefined,
          width: { ideal: 1280 }, height: { ideal: 720 }
        },
        audio: {
          deviceId: micSelect && micSelect.value ? { exact: micSelect.value } : undefined,
          echoCancellation: true, noiseSuppression: true
        }
      };

      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (devicePreviewVideo) devicePreviewVideo.srcObject = mediaStream;
      if (interviewVideo) interviewVideo.srcObject = mediaStream;

      watchTracks(mediaStream);
      startMicMeter(mediaStream, deviceMicBar);
    } catch (e) {
      console.error('Device switch error:', e);
      notify('Failed to switch device. The previous device may still be in use.', 'error');
    }
  }

  // Mic level meter
  function startMicMeter(stream, barEl) {
    if (!stream || !barEl) return;
    stopMicMeter();
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') audioContext.resume();

      if (micSource) { try { micSource.disconnect(); } catch (e) {} }

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      micSource = audioContext.createMediaStreamSource(stream);
      micSource.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function update() {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const pct = Math.min(100, Math.round((avg / 128) * 100));
        barEl.style.width = `${pct}%`;
        animFrameId = requestAnimationFrame(update);
      }
      update();
    } catch (e) {
      console.warn('Mic meter error:', e);
    }
  }

  function stopMicMeter() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  // Speaker test — a short tone routed through the selected output device.
  if (testSpeakerBtn) {
    testSpeakerBtn.addEventListener('click', async () => {
      testSpeakerBtn.disabled = true;
      try {
        await playTestTone();
      } catch (e) {
        console.warn('Speaker test error:', e);
        notify('Could not play the test sound. Check your system volume and output device.', 'error');
      } finally {
        setTimeout(() => { testSpeakerBtn.disabled = false; }, 900);
      }
    });
  }

  async function playTestTone() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') await audioContext.resume();

    const destination = audioContext.createMediaStreamDestination();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;

    // Fade in and out so the tone is pleasant rather than a click.
    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.setValueAtTime(0.25, now + 0.55);
    gain.gain.linearRampToValueAtTime(0, now + 0.7);

    osc.connect(gain);
    gain.connect(destination);

    if (!testAudioEl) {
      testAudioEl = document.createElement('audio');
      testAudioEl.autoplay = true;
    }
    testAudioEl.srcObject = destination.stream;

    if (speakerSelect && speakerSelect.value && typeof testAudioEl.setSinkId === 'function') {
      try { await testAudioEl.setSinkId(speakerSelect.value); } catch (e) { /* fall back to default output */ }
    }

    osc.start(now);
    osc.stop(now + 0.75);
    await testAudioEl.play().catch(() => {});
  }

  if (speakerHeardCheck) {
    speakerHeardCheck.addEventListener('change', () => {
      speakerConfirmed = speakerHeardCheck.checked;
      setDeviceStatus(speakerStatusEl, speakerConfirmed, speakerConfirmed ? 'Speaker confirmed' : 'Speaker not confirmed');
      refreshDeviceGate();
    });
  }

  // =====================================================================
  // BEGIN INTERVIEW
  // =====================================================================
  if (beginInterviewBtn) {
    beginInterviewBtn.addEventListener('click', () => {
      if (!questions.length) {
        notify('No interview questions were loaded. Please restart the interview.', 'error');
        return;
      }

      isInterviewActive = true;
      interviewStartTime = Date.now();
      currentQuestionIndex = 0;
      answeredCount = 0;
      showView(interviewView);

      if (interviewVideo && mediaStream) interviewVideo.srcObject = mediaStream;

      // The device-check meter is no longer visible.
      stopMicMeter();
      syncDeviceIndicators();

      loadQuestion(0);
    });
  }

  // =====================================================================
  // QUESTION FLOW — STEP 1: the interviewer reads the question, then the
  // candidate gets preparation time. Nothing is recorded in either phase.
  // =====================================================================
  function loadQuestion(index) {
    if (index >= questions.length) {
      finishInterview();
      return;
    }

    const myToken = ++loadToken;

    currentQuestionIndex = index;
    rerecordsLeft = maxRerecords;
    rerecordsUsed = 0;
    currentTranscript = '';
    recordedChunks = [];
    recordedBlob = null;
    answerElapsedSeconds = 0;
    answerStartedAt = null;
    releaseRecordedUrl();

    const q = questions[index];
    const answerTime = q.answerTime || 120;
    const prepTime = q.prepTime || 30;

    // Answered questions out of everything now known to be in the interview.
    // Probes are added as they are earned, so the denominator can grow.
    const progress = (index / questions.length) * 100;
    if (interviewProgressFill) interviewProgressFill.style.width = `${progress}%`;

    if (questionNumber) {
      questionNumber.textContent = q.isFollowUp
        ? `Follow-up to question ${q.mainNumber}`
        : `Question ${q.mainNumber || index + 1} of ${totalMainQuestions || questions.length}`;
    }
    if (questionCategory) questionCategory.textContent = q.category || 'Technical';
    if (questionText) questionText.textContent = q.question;
    if (metaPrepTime) metaPrepTime.textContent = `${prepTime}s`;
    if (metaAnswerTime) metaAnswerTime.textContent = formatTime(answerTime);

    if (followUpNote) followUpNote.classList.toggle('hidden', !q.isFollowUp);
    if (followUpNoteText && q.isFollowUp) {
      followUpNoteText.textContent = 'The interviewer is following up on the answer you just gave.';
    }

    hide(recIndicator);
    show(actionPrep);
    hide(actionRecording);
    if (answerTimerContainer) answerTimerContainer.className = 'vi-answer-timer';
    if (answerTimer) answerTimer.textContent = formatTime(answerTime);
    if (prepOverlay) prepOverlay.classList.remove('is-hidden');

    // Listening first: the preparation clock only starts once the question has
    // been read, so hearing it never eats into thinking time.
    enterListeningPhase(q, prepTime);
    speak(q.question, () => {
      // A late callback from a question the candidate has already left must not
      // start a countdown over the top of the current one.
      if (myToken !== loadToken || !isInterviewActive) return;
      beginPreparation(prepTime);
    });
  }

  /**
   * The interviewer is reading the question. Preparation has not begun, so no
   * countdown is shown and the prep cannot be skipped yet.
   */
  function enterListeningPhase(q, prepTime) {
    const willSpeak = voiceSupported && !voiceMuted;

    if (prepOverlayLabel) {
      prepOverlayLabel.textContent = willSpeak ? 'Listen to the question' : 'Preparation Time';
    }
    if (prepTimer) prepTimer.textContent = willSpeak ? '···' : String(prepTime);
    if (prepOverlayHint) {
      prepOverlayHint.textContent = willSpeak
        ? 'Preparation time starts once the question has been read'
        : 'Read the question and prepare your answer';
    }
    if (prepActionHint) {
      prepActionHint.textContent = willSpeak
        ? 'The interviewer is reading the question aloud.'
        : 'Recording will begin after preparation time ends.';
    }
    if (skipPrepBtn) skipPrepBtn.disabled = willSpeak;
    setInstruction(q.isFollowUp
      ? 'Listen carefully — this follow-up is about the answer you just gave.'
      : 'Listen to the question, then take a moment to think before answering.');
  }

  function beginPreparation(prepTime) {
    if (prepOverlayLabel) prepOverlayLabel.textContent = 'Preparation Time';
    if (prepOverlayHint) prepOverlayHint.textContent = 'Read the question and prepare your answer';
    if (prepActionHint) prepActionHint.textContent = 'Recording will begin after preparation time ends.';
    if (skipPrepBtn) skipPrepBtn.disabled = false;
    setInstruction('Take a moment to think before answering. Speak clearly and structure your answer.');
    startPrepCountdown(prepTime);
  }

  function setInstruction(text) {
    if (!questionInstructions) return;
    const span = questionInstructions.querySelector('span');
    if (span) span.textContent = text;
  }

  function startPrepCountdown(duration) {
    // Driven off a wall-clock deadline: a background tab throttles setInterval,
    // and counting ticks there would silently stretch the preparation window.
    const deadline = Date.now() + duration * 1000;
    if (prepTimer) prepTimer.textContent = String(duration);

    clearInterval(prepInterval);
    prepInterval = setInterval(() => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      if (prepTimer) prepTimer.textContent = String(Math.max(0, remaining));

      if (remaining <= 0) {
        clearInterval(prepInterval);
        prepInterval = null;
        startRecording();
      }
    }, 250);
  }

  if (skipPrepBtn) {
    skipPrepBtn.addEventListener('click', () => {
      if (prepInterval) {
        clearInterval(prepInterval);
        prepInterval = null;
      }
      startRecording();
    });
  }

  // =====================================================================
  // STEP 2: recording
  // =====================================================================
  function startRecording() {
    if (!mediaStream) {
      notify('Camera stream unavailable. Please restart the interview.', 'error');
      return;
    }

    // Anything the interviewer is still saying would be picked up by the
    // microphone and land in both the recording and the transcript.
    cancelSpeech();
    if (repeatQuestionBtn) repeatQuestionBtn.disabled = true;

    if (prepOverlay) prepOverlay.classList.add('is-hidden');
    hide(actionPrep);
    show(actionRecording);
    show(recIndicator);
    setInstruction('You are being recorded. Answer with specific examples, then press Finish Answer.');

    recordedChunks = [];
    currentTranscript = '';
    recordedBlob = null;
    answerElapsedSeconds = 0;
    answerStartedAt = null;
    releaseRecordedUrl();
    if (answerTimerContainer) answerTimerContainer.className = 'vi-answer-timer';

    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

      // Resolves once the final chunk has been flushed, so the review screen
      // never plays a truncated blob.
      recordingStoppedPromise = new Promise(resolve => {
        mediaRecorder.onstop = () => {
          recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
          resolve();
        };
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        notify('Recording stopped unexpectedly. You can re-record this answer.', 'error');
      };

      mediaRecorder.start(1000); // flush a chunk every second
    } catch (e) {
      console.error('MediaRecorder error:', e);
      recordingStoppedPromise = Promise.resolve();
      notify('Video recording failed. Please check your camera and try again.', 'error');
    }

    startSpeechRecognition();
    const q = questions[currentQuestionIndex];
    startAnswerCountdown((q && q.answerTime) || 120);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) { /* already stopping */ }
    }

    stopSpeechRecognition();

    if (answerInterval) {
      clearInterval(answerInterval);
      answerInterval = null;
    }

    hide(recIndicator);
  }

  // =====================================================================
  // STEP 3: finish answer
  // =====================================================================
  async function finishAnswer() {
    // The max-duration timer and the Finish Answer button can both land here;
    // only the first one should drive the transition to review.
    if (isFinishingAnswer) return;
    isFinishingAnswer = true;

    if (finishAnswerBtn) finishAnswerBtn.disabled = true;
    // Record the true elapsed time before the timers are torn down.
    if (answerStartedAt) {
      const cap = (questions[currentQuestionIndex] || {}).answerTime || 120;
      answerElapsedSeconds = Math.min(cap, Math.round((Date.now() - answerStartedAt) / 1000));
    }
    stopRecording();
    // Wait for the recorder to flush rather than guessing with a timeout.
    try { await recordingStoppedPromise; } catch (e) {}
    if (finishAnswerBtn) finishAnswerBtn.disabled = false;
    isFinishingAnswer = false;
    showReview();
  }

  if (finishAnswerBtn) {
    finishAnswerBtn.addEventListener('click', finishAnswer);
  }

  function startAnswerCountdown(duration) {
    // Wall-clock deadline for the same reason as the preparation timer: the
    // maximum answer length has to hold even if the tab loses focus.
    answerStartedAt = Date.now();
    const deadline = answerStartedAt + duration * 1000;
    answerElapsedSeconds = 0;
    if (answerTimer) answerTimer.textContent = formatTime(duration);

    clearInterval(answerInterval);
    answerInterval = setInterval(() => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      answerElapsedSeconds = Math.min(duration, Math.round((Date.now() - answerStartedAt) / 1000));
      if (answerTimer) answerTimer.textContent = formatTime(remaining);

      if (answerTimerContainer) {
        if (remaining <= 10) {
          answerTimerContainer.className = 'vi-answer-timer is-danger';
        } else if (remaining <= 30) {
          answerTimerContainer.className = 'vi-answer-timer is-warning';
        }
      }

      if (remaining <= 0) {
        clearInterval(answerInterval);
        answerInterval = null;
        notify('Time is up for this answer — moving to review.', 'info');
        finishAnswer();
      }
    }, 250);
  }

  // =====================================================================
  // SPEECH RECOGNITION (produces the transcript that gets evaluated)
  // =====================================================================
  function startSpeechRecognition() {
    if (!SpeechRecognition) return;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t + ' ';
          } else {
            interim += t;
          }
        }
        currentTranscript = (finalTranscript + interim).trim();
      };

      recognition.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          notify('Speech transcription was blocked, so this answer cannot be scored. Your video is still recording.', 'error');
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech recognition error:', e.error);
        }
      };

      // Chrome ends the session periodically; restart while still recording.
      recognition.onend = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition init error:', e);
    }
  }

  function stopSpeechRecognition() {
    if (recognition) {
      recognition.onend = null;
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
  }

  // =====================================================================
  // STEP 4: review — continue or re-record
  // =====================================================================
  function showReview() {
    showView(reviewView);
    hide(reviewSubmitError);

    const q = questions[currentQuestionIndex];
    if (reviewQuestionText) reviewQuestionText.textContent = q ? q.question : 'Question';

    if (reviewPlayer) {
      releaseRecordedUrl();
      if (recordedBlob && recordedBlob.size > 0) {
        recordedUrl = URL.createObjectURL(recordedBlob);
        reviewPlayer.src = recordedUrl;
        reviewPlayer.load();
      } else {
        reviewPlayer.removeAttribute('src');
      }
    }

    if (reviewTranscript) {
      if (currentTranscript) {
        reviewTranscript.textContent = currentTranscript;
      } else if (!SpeechRecognition) {
        reviewTranscript.textContent = 'This browser cannot transcribe speech, so no transcript was captured. Without a transcript this answer cannot be scored.';
      } else {
        reviewTranscript.textContent = 'No speech was detected. Re-record your answer if your microphone was muted — an empty answer scores zero.';
      }
    }

    if (rerecordCount) rerecordCount.textContent = `(${rerecordsLeft} left)`;
    if (rerecordBtn) rerecordBtn.disabled = rerecordsLeft <= 0;
  }

  if (rerecordBtn) {
    rerecordBtn.addEventListener('click', () => {
      if (rerecordsLeft <= 0) return;
      rerecordsLeft--;
      rerecordsUsed++;

      showView(interviewView);
      recordedChunks = [];
      recordedBlob = null;
      currentTranscript = '';
      releaseRecordedUrl();

      // Preparation already happened for this question; go straight to recording.
      startRecording();
    });
  }

  if (confirmAnswerBtn) {
    confirmAnswerBtn.addEventListener('click', async () => {
      setBusy(confirmAnswerBtn, true);
      hide(reviewSubmitError);
      if (rerecordBtn) rerecordBtn.disabled = true;

      let submitted = false;
      let followUp = null;
      try {
        const q = questions[currentQuestionIndex] || {};
        const res = await fetch(`${baseUrl}/api/interview/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sessionId: activeSessionId,
            // The backend addresses its own stored question rows; a follow-up
            // sits at the end of that list, not next to its parent.
            questionIndex: Number.isInteger(q.serverIndex) ? q.serverIndex : currentQuestionIndex,
            transcript: currentTranscript || '(No speech detected)',
            answerSeconds: answerElapsedSeconds,
            rerecordCount: rerecordsUsed
          })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          submitted = true;
          answeredCount = data.answeredCount || (answeredCount + 1);
          followUp = data.followUp || null;
        } else {
          showSubmitError(data.message || 'Failed to submit your answer. Please try again.');
        }
      } catch (e) {
        console.error(e);
        showSubmitError('Network error submitting your answer. Check your connection and try again.');
      } finally {
        setBusy(confirmAnswerBtn, false);
        if (rerecordBtn) rerecordBtn.disabled = rerecordsLeft <= 0;
      }

      // Only advance once the answer is safely stored — a failed submit keeps
      // the candidate on this question so nothing is silently lost.
      if (!submitted) return;

      // The interviewer wants to drill into what was just said, so the probe is
      // asked next rather than at the end of the interview.
      if (followUp && followUp.question) {
        const parent = questions[currentQuestionIndex] || {};
        questions.splice(currentQuestionIndex + 1, 0, {
          question: followUp.question,
          category: followUp.category || 'Follow-up',
          difficulty: followUp.difficulty || parent.difficulty || 'Medium',
          prepTime: followUp.prepTime || 15,
          answerTime: followUp.answerTime || 75,
          serverIndex: followUp.index,
          // Numbered after its parent, so the candidate reads it as depth on the
          // question they just answered rather than as a new topic.
          mainNumber: parent.mainNumber || currentQuestionIndex + 1,
          isFollowUp: true
        });
      }

      releaseRecordedUrl();
      currentQuestionIndex++;
      if (currentQuestionIndex >= questions.length) {
        finishInterview();
      } else {
        showView(interviewView);
        loadQuestion(currentQuestionIndex);
      }
    });
  }

  function showSubmitError(message) {
    if (reviewSubmitError) {
      reviewSubmitError.textContent = message;
      show(reviewSubmitError);
    }
    notify(message, 'error');
  }

  // =====================================================================
  // COMPLETION
  // =====================================================================
  function finishInterview() {
    isInterviewActive = false;
    cancelSpeech();
    stopRecording();
    stopMicMeter();
    releaseRecordedUrl();

    if (interviewProgressFill) interviewProgressFill.style.width = '100%';

    const durationMs = Date.now() - (interviewStartTime || Date.now());
    const durationMin = Math.max(1, Math.round(durationMs / 60000));

    showView(completedView);
    if (completedQCount) completedQCount.textContent = `${answeredCount} / ${questions.length}`;
    if (completedDuration) completedDuration.textContent = `${durationMin} min`;
  }

  // =====================================================================
  // REPORT
  // =====================================================================
  if (viewReportBtn) {
    viewReportBtn.addEventListener('click', async () => {
      setBusy(viewReportBtn, true);

      try {
        const res = await fetch(`${baseUrl}/api/interview/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessionId: activeSessionId })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.report) {
          showView(reportView);
          renderReport(data.report, data.answers);
          releaseCamera();
        } else {
          notify(data.message || 'Failed to generate report.', 'error');
        }
      } catch (e) {
        console.error(e);
        notify('Error generating the interview report. Your answers are saved — try again.', 'error');
      } finally {
        setBusy(viewReportBtn, false);
      }
    });
  }

  function releaseCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    if (devicePreviewVideo) devicePreviewVideo.srcObject = null;
    if (interviewVideo) interviewVideo.srcObject = null;
  }

  function renderReport(report, answers = []) {
    const scoreEl = document.getElementById('repScore');
    if (scoreEl) scoreEl.textContent = report.overallScore || 0;

    const summaryEl = document.getElementById('repSummary');
    if (summaryEl) {
      summaryEl.textContent = report.summary || '';
      summaryEl.classList.toggle('hidden', !report.summary);
    }

    const metaEl = document.getElementById('repMeta');
    if (metaEl) {
      const parts = [];
      const asked = report.totalQuestionsAsked;
      const total = report.totalQuestions || questions.length;
      if (total) parts.push(`${asked != null ? asked : answers.length} of ${total} questions answered`);
      if (report.meaningfulAnswersCount != null) parts.push(`${report.meaningfulAnswersCount} substantive`);
      if (report.durationMinutes) parts.push(`${report.durationMinutes} min`);
      metaEl.textContent = parts.join(' · ');
    }

    const cats = report.categoryScores || {};
    animateScoreBar('catTechnical', 'catTechnicalBar', cats.technical || 0);
    animateScoreBar('catCommunication', 'catCommunicationBar', cats.communication || 0);
    animateScoreBar('catProblemSolving', 'catProblemSolvingBar', cats.problemSolving || 0);
    animateScoreBar('catConfidence', 'catConfidenceBar', cats.confidence || 0);
    animateScoreBar('catRelevance', 'catRelevanceBar', cats.relevance || 0);

    const populateList = (arr, id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = '';
      (arr || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        el.appendChild(li);
      });
    };

    populateList(report.strengths, 'repStrengths');
    populateList(report.weaknesses, 'repWeaknesses');
    populateList(report.improvementSuggestions, 'repSuggestions');
    populateList(report.recommendedLearningPath, 'repLearning');

    const perAnsContainer = document.getElementById('repPerAnswerList');
    if (!perAnsContainer) return;
    perAnsContainer.innerHTML = '';

    if (!answers || answers.length === 0) {
      perAnsContainer.innerHTML = '<p class="vi-answer-log-empty">No individual answer logs were recorded.</p>';
      return;
    }

    answers.forEach((ans, idx) => {
      const item = document.createElement('div');
      item.className = 'vi-answer-log-item';

      const scores = ans.scores || {};
      const scoreVal = scores.overall !== undefined ? scores.overall : 0;
      const qLabel = (ans.questionId && typeof ans.questionId === 'object')
        ? ans.questionId.question
        : (questions[idx] ? questions[idx].question : `Question ${idx + 1}`);

      const dimension = (label, value) =>
        `<span class="vi-answer-log-dim"><em>${label}</em> ${value != null ? value : 0}</span>`;

      item.innerHTML = `
        <div class="vi-answer-log-head">
          <strong class="vi-answer-log-q">Q${idx + 1}: ${escapeHtml(qLabel)}</strong>
          <span class="badge ${scoreVal >= 60 ? 'badge-success' : 'badge-danger'}">${scoreVal}/100</span>
        </div>
        <div class="vi-answer-log-dims">
          ${dimension('Technical', scores.technical)}
          ${dimension('Relevance', scores.relevance)}
          ${dimension('Problem solving', scores.problemSolving)}
          ${dimension('Structure', scores.structure)}
          ${dimension('Communication', scores.communication)}
        </div>
        <p class="vi-answer-log-transcript">&ldquo;${escapeHtml(ans.transcript || 'No transcript captured')}&rdquo;</p>
        ${ans.feedback ? `<div class="vi-answer-log-feedback"><i class="fa-solid fa-comment-dots"></i> <span>${escapeHtml(ans.feedback)}</span></div>` : ''}
        ${ans.suggestedApproach ? `<div class="vi-answer-log-suggestion"><i class="fa-solid fa-lightbulb"></i> <span><strong>Suggested approach:</strong> ${escapeHtml(ans.suggestedApproach)}</span></div>` : ''}
      `;
      perAnsContainer.appendChild(item);
    });
  }

  function animateScoreBar(valueId, barId, score) {
    const valueEl = document.getElementById(valueId);
    const barEl = document.getElementById(barId);
    if (valueEl) valueEl.textContent = `${score}/100`;
    if (barEl) {
      // Let the bar paint at 0 first so the width transition is visible.
      setTimeout(() => { barEl.style.width = `${score}%`; }, 200);
    }
  }
});
