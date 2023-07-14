import React, { useEffect, useState, useCallback } from 'react';
import Call from '../Call/Call';
import StartButton from '../StartButton/StartButton';
import api from '../../api';
import './App.css';
import Tray from '../Tray/Tray';
import CallObjectContext from '../../CallObjectContext';
import { roomUrlFromPageUrl, pageUrlFromRoomUrl } from '../../urlUtils';
import DailyIframe from '@daily-co/daily-js';
import { logDailyEvent } from '../../logUtils';

const STATE_IDLE = 'STATE_IDLE';
const STATE_CREATING = 'STATE_CREATING';
const STATE_JOINING = 'STATE_JOINING';
const STATE_JOINED = 'STATE_JOINED';
const STATE_LEAVING = 'STATE_LEAVING';
const STATE_ERROR = 'STATE_ERROR';

window.localStorage.debug = 'daily*local-cam-mic';

export default function App() {
  const [appState, setAppState] = useState(STATE_IDLE);
  const [roomUrl, setRoomUrl] = useState(null);
  const [callObject, setCallObject] = useState(null);

  /**
   * Creates a new call room.
   */
  const createCall = useCallback(() => {
    setAppState(STATE_CREATING);
    return api
      .createRoom()
      .then((room) => room.url)
      .catch((error) => {
        console.log('Error creating room', error);
        setRoomUrl(null);
        setAppState(STATE_IDLE);
      });
  }, []);

  /**
   * Starts joining an existing call.
   *
   * NOTE: In this demo we show how to completely clean up a call with destroy(),
   * which requires creating a new call object before you can join() again.
   * This isn't strictly necessary, but is good practice when you know you'll
   * be done with the call object for a while and you're no longer listening to its
   * events.
   */
  const startJoiningCall = useCallback((url) => {
    const newCallObject = DailyIframe.createCallObject({
      url,

      // token:
      // no perms
      // 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwIjp7ImNzIjpmYWxzZX0sImQiOiI1NDAxMzc4ZS0wYjVmLTQ3ZWMtODk1My0zMDM2MzI4MTc5MmQiLCJpYXQiOjE2NzY1NzYxMTV9.ibSMfOiEOCssgTkhhV2XLXhS-RI_9_1C0ou7QOk775U',
      // owner
      // 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvIjp0cnVlLCJkIjoiNTQwMTM3OGUtMGI1Zi00N2VjLTg5NTMtMzAzNjMyODE3OTJkIiwiaWF0IjoxNjc2NTc3MTgyfQ.z76wOzLsOOainh88uVc0bpiItvHSQWG70IzThKOlU2A',

      // owner token for paulk.ngrok.io
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvIjp0cnVlLCJkIjoiNTQwMTM3OGUtMGI1Zi00N2VjLTg5NTMtMzAzNjMyODE3OTJkIiwiaWF0IjoxNjg5MTcxNjk0fQ.KGXZ0AfsglgnMacXbokGuaZpIHHpG81D44TNGe86vfg',
      // inputSettings:
      // valid
      // {
      //   video: { processor: { type: 'background-image' } },
      // },
      // invalid
      // {
      //   video: {
      //     processor: {
      //       type: 'background-image',
      //       config: {
      //         source: 'https://daily.co/foo/bar.jpg',
      //       },
      //     },
      //   },
      // },

      dailyConfig: {
        // keepCamIndicatorLightOn: true, // default: false
        // -- v2 --
        v2CamAndMic: true, // default: false
        // -- v1 --
        // alwaysIncludeCamInPermissionPrompt: true, // default: false
        // alwaysIncludeMicInPermissionPrompt: false, // default: true
        useDevicePreferenceCookies: true, // default: false
      },

      // startAudioOff: true,
      // startVideoOff: true,
    });
    setRoomUrl(url);
    setCallObject(newCallObject);
    setAppState(STATE_JOINING);
    newCallObject.join();
  }, []);

  /**
   * Starts leaving the current call.
   */
  const startLeavingCall = useCallback(() => {
    if (!callObject) return;
    // If we're in the error state, we've already "left", so just clean up
    if (appState === STATE_ERROR) {
      callObject.destroy().then(() => {
        setRoomUrl(null);
        setCallObject(null);
        setAppState(STATE_IDLE);
      });
    } else {
      setAppState(STATE_LEAVING);
      callObject.leave();
    }
  }, [callObject, appState]);

  /**
   * If a room's already specified in the page's URL when the component mounts,
   * join the room.
   */
  useEffect(() => {
    const url = roomUrlFromPageUrl();
    url && startJoiningCall(url);
  }, [startJoiningCall]);

  /**
   * Update the page's URL to reflect the active call when roomUrl changes.
   *
   * This demo uses replaceState rather than pushState in order to avoid a bit
   * of state-management complexity. See the comments around enableCallButtons
   * and enableStartButton for more information.
   */
  useEffect(() => {
    const pageUrl = pageUrlFromRoomUrl(roomUrl);
    if (pageUrl === window.location.href) return;
    window.history.replaceState(null, null, pageUrl);
  }, [roomUrl]);

  /**
   * Create translation debugging helpers.
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    window.translateIntoSpanish = async (into) => {
      await window.rtcpeers.forceSwitchToSoup();
      callObject.updateTranslationSettings({
        translateInboundAudioInto: into,
        language: 'es',
      });
    };

    window.translateIntoEnglish = async (into) => {
      await window.rtcpeers.forceSwitchToSoup();
      callObject.updateTranslationSettings({
        translateInboundAudioInto: into,
        language: 'en',
      });
    };
  }, [callObject]);

  /**
   * Uncomment to attach call object to window for debugging purposes.
   */
  useEffect(() => {
    window.callObject = callObject;

    if (!callObject) {
      return;
    }

    callObject.on('camera-error', (e) => {
      console.log('[EVENT] camera error!', e.error, e.errorMsg);
    });

    callObject.on('input-settings-updated', (e) => {
      console.log('[EVENT] input settings updated!', e);
    });

    callObject.on('selected-devices-updated', (e) => {
      console.log('[EVENT] selected devices updated!', e);
    });

    callObject.on('nonfatal-error', (e) => {
      if (e.type === 'input-settings-error') {
        console.log('[EVENT] input settings error!', e);
      } else if (e.type === 'video-processor-error') {
        console.log('[EVENT] video processor error!', e);
      } else if (e.type === 'audio-processor-error') {
        console.log('[EVENT] audio processor error!', e);
      }
    });

    callObject.on('available-devices-updated', (e) => {
      console.log('[EVENT] available devices updated!', e);
    });

    callObject.on('started-camera', (e) => {
      console.log('[EVENT] started camera!', e);
    });

    window.switchMicToFirstNonDefault = async () => {
      const availableDevices = await callObject.enumerateDevices();
      const firstNonDefaultMic = availableDevices.devices.find(
        (d) => d.kind === 'audioinput' && d.deviceId !== 'default'
      );
      const newDevices = await callObject.setInputDevicesAsync({
        audioDeviceId: firstNonDefaultMic.deviceId,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchMicToDefault = async () => {
      const newDevices = await callObject.setInputDevicesAsync({
        audioDeviceId: 'default',
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchMicToInvalid = async () => {
      const newDevices = await callObject.setInputDevicesAsync({
        audioDeviceId: 'boop',
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchMicToCustom = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const track = stream.getAudioTracks()[0];
      const newDevices = await callObject.setInputDevicesAsync({
        audioSource: track,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchMicToFalse = async () => {
      const newDevices = await callObject.setInputDevicesAsync({
        audioSource: false,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchCamToIPhone = async () => {
      const availableDevices = await callObject.enumerateDevices();
      const cam = availableDevices.devices.find(
        (d) => d.kind === 'videoinput' && d.label.includes('iPhone')
      );
      const newDevices = await callObject.setInputDevicesAsync({
        videoDeviceId: cam.deviceId,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchCamToMac = async () => {
      const availableDevices = await callObject.enumerateDevices();
      const cam = availableDevices.devices.find(
        (d) => d.kind === 'videoinput' && d.label.includes('FaceTime')
      );
      const newDevices = await callObject.setInputDevicesAsync({
        videoDeviceId: cam.deviceId,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchCamToCustom = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { frameRate: 2 },
      });
      const track = stream.getVideoTracks()[0];
      const newDevices = await callObject.setInputDevicesAsync({
        videoSource: track,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchCamToFalse = async () => {
      const newDevices = await callObject.setInputDevicesAsync({
        videoSource: false,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchOutputToHeadphones = async () => {
      const availableDevices = await callObject.enumerateDevices();
      const output = availableDevices.devices.find(
        (d) => d.kind === 'audiooutput' && d.label.includes('External')
      );
      const newDevices = await callObject.setOutputDeviceAsync({
        outputDeviceId: output.deviceId,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchOutputToMac = async () => {
      const availableDevices = await callObject.enumerateDevices();
      const output = availableDevices.devices.find(
        (d) => d.kind === 'audiooutput' && d.label.includes('MacBook')
      );
      const newDevices = await callObject.setOutputDeviceAsync({
        outputDeviceId: output.deviceId,
      });
      console.log('done switching. result: ', newDevices);
    };

    window.switchOutputToHeadphonesThenJoin = async () => {
      await window.switchOutputToHeadphones();
      callObject.join();
    };

    window.switchOutputToInvalidThenJoin = async () => {
      await callObject.setOutputDeviceAsync({
        outputDeviceId: 'blerf',
      });
      callObject.join();
    };

    window.logRemoteParticipantTrackState = () => {
      let showHeader = true;
      for (const [id, participant] of Object.entries(
        callObject.participants()
      )) {
        if (id !== 'local') {
          showHeader && console.log('\n// REMOTE');
          showHeader = false;
          const trackStates = participant.tracks;
          console.log({
            audio: trackStates.audio.state,
            video: trackStates.video.state,
            screenVideo: trackStates.screenVideo.state,
            screenAudio: trackStates.screenAudio.state,
          });
        }
      }
    };

    window.logLocalParticipantTrackState = () => {
      if (callObject.participants().local) {
        console.log('\n// LOCAL');
        const trackStates = callObject.participants().local.tracks;
        console.log({
          audio: trackStates.audio.state,
          video: trackStates.video.state,
          screenVideo: trackStates.screenVideo.state,
          screenAudio: trackStates.screenAudio.state,
        });
      }
    };

    window.bgBlur = async () => {
      const newInputSettings = await callObject.updateInputSettings({
        video: { processor: { type: 'background-blur' } },
      });
      console.log('done updating input settings. result: ', newInputSettings);
    };

    window.bgBlurWeak = async () => {
      const newInputSettings = await callObject.updateInputSettings({
        video: {
          processor: { type: 'background-blur', config: { strength: 0.25 } },
        },
      });
      console.log('done updating input settings. result: ', newInputSettings);
    };

    window.unprocessCam = async () => {
      const newInputSettings = await callObject.updateInputSettings({
        video: { processor: { type: 'none' } },
      });
      console.log('done updating input settings. result: ', newInputSettings);
    };

    window.bgImg = async () => {
      const newInputSettings = await callObject.updateInputSettings({
        video: { processor: { type: 'background-image' } },
      });
      console.log('done updating input settings. result: ', newInputSettings);
    };

    window.bgImgInvalid = async () => {
      try {
        const newInputSettings = await callObject.updateInputSettings({
          video: {
            processor: {
              type: 'background-image',
              config: {
                source: 'https://daily.co/foo/bar.jpg',
              },
            },
          },
        });
        console.log('done updating input settings. result: ', newInputSettings);
      } catch (e) {
        console.log('error updating input settings: ', e);
      }
    };

    window.bgImgCustom = async () => {
      try {
        const newInputSettings = await callObject.updateInputSettings({
          video: {
            processor: {
              type: 'background-image',
              config: {
                source:
                  'https://upload.wikimedia.org/wikipedia/commons/a/aa/Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg',
              },
            },
          },
        });
        console.log('done updating input settings. result: ', newInputSettings);
      } catch (e) {
        console.log('error updating input settings: ', e);
      }
    };

    window.noiseCancel = async () => {
      try {
        const newInputSettings = await callObject.updateInputSettings({
          audio: { processor: { type: 'noise-cancellation' } },
        });
        console.log('done updating input settings. result: ', newInputSettings);
      } catch (e) {
        console.log('error updating input settings: ', e);
      }
    };

    window.unprocessMic = async () => {
      const newInputSettings = await callObject.updateInputSettings({
        audio: { processor: { type: 'none' } },
      });
      console.log('done updating input settings. result: ', newInputSettings);
    };

    window.processCamAndMic = async () => {
      const newInputSettings = await callObject.updateInputSettings({
        video: { processor: { type: 'background-image' } },
        audio: { processor: { type: 'noise-cancellation' } },
      });
      console.log('done updating input settings. result: ', newInputSettings);
    };

    window.mic = () => {
      return callObject.participants().local.tracks.audio;
    };

    window.cam = () => {
      return callObject.participants().local.tracks.video;
    };

    window.callSetBandwidthWithFrameRate = (frameRate) => {
      callObject.setBandwidth({ trackConstraints: { frameRate } });
    };
  }, [callObject]);

  /**
   * Update app state based on reported meeting state changes.
   *
   * NOTE: Here we're showing how to completely clean up a call with destroy().
   * This isn't strictly necessary between join()s, but is good practice when
   * you know you'll be done with the call object for a while and you're no
   * longer listening to its events.
   */
  useEffect(() => {
    if (!callObject) return;

    const events = ['joined-meeting', 'left-meeting', 'error'];

    function handleNewMeetingState(event) {
      event && logDailyEvent(event);
      switch (callObject.meetingState()) {
        case 'joined-meeting':
          setAppState(STATE_JOINED);
          break;
        case 'left-meeting':
          callObject.destroy().then(() => {
            setRoomUrl(null);
            setCallObject(null);
            setAppState(STATE_IDLE);
          });
          break;
        case 'error':
          setAppState(STATE_ERROR);
          break;
        default:
          break;
      }
    }

    // Use initial state
    handleNewMeetingState();

    // Listen for changes in state
    for (const event of events) {
      callObject.on(event, handleNewMeetingState);
    }

    // Stop listening for changes in state
    return function cleanup() {
      for (const event of events) {
        callObject.off(event, handleNewMeetingState);
      }
    };
  }, [callObject]);

  /**
   * Listen for app messages from transcription.
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    async function handleAppMessage(event) {
      const data = event.data;
      if (event?.fromId === 'transcription' && data?.is_final) {
        // Print out transcription
        const userName =
          callObject.participants().local.session_id === data.session_id
            ? 'You'
            : callObject.participants()[data.session_id].user_name || 'Guest';
        console.log(`${userName} (${data.timestamp}): ${data.text}`);
      }
    }

    callObject.on('app-message', handleAppMessage);

    return function cleanup() {
      callObject.off('app-message', handleAppMessage);
    };
  }, [callObject]);

  /**
   * Listen for app messages from translation.
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    async function handleAppMessage(event) {
      const data = event.data;
      if (event?.fromId === 'translation') {
        // Ignore local translations
        if (callObject.participants().local.session_id === data.session_id) {
          return;
        }

        // Print out translation
        const userName =
          callObject.participants()[data.session_id].user_name || 'Guest';
        console.log(
          `[translated] ${userName} (${data.timestamp}): ${data.text}`
        );
      }
    }

    callObject.on('app-message', handleAppMessage);

    return function cleanup() {
      callObject.off('app-message', handleAppMessage);
    };
  }, [callObject]);

  /**
   * Show the call UI if we're either joining, already joined, or are showing
   * an error.
   */
  const showCall = [STATE_JOINING, STATE_JOINED, STATE_ERROR].includes(
    appState
  );

  /**
   * Only enable the call buttons (camera toggle, leave call, etc.) if we're joined
   * or if we've errored out.
   *
   * !!!
   * IMPORTANT: calling callObject.destroy() *before* we get the "joined-meeting"
   * can result in unexpected behavior. Disabling the leave call button
   * until then avoids this scenario.
   * !!!
   */
  const enableCallButtons = [STATE_JOINED, STATE_ERROR].includes(appState);

  /**
   * Only enable the start button if we're in an idle state (i.e. not creating,
   * joining, etc.).
   *
   * !!!
   * IMPORTANT: only one call object is meant to be used at a time. Creating a
   * new call object with DailyIframe.createCallObject() *before* your previous
   * callObject.destroy() completely finishes can result in unexpected behavior.
   * Disabling the start button until then avoids that scenario.
   * !!!
   */
  const enableStartButton = appState === STATE_IDLE;

  return (
    <div className="app">
      {showCall ? (
        // NOTE: for an app this size, it's not obvious that using a Context
        // is the best choice. But for larger apps with deeply-nested components
        // that want to access call object state and bind event listeners to the
        // call object, this can be a helpful pattern.
        <CallObjectContext.Provider value={callObject}>
          <Call roomUrl={roomUrl} />
          <Tray
            disabled={!enableCallButtons}
            onClickLeaveCall={startLeavingCall}
          />
        </CallObjectContext.Provider>
      ) : (
        <StartButton
          disabled={!enableStartButton}
          onClick={() => {
            createCall().then((url) => startJoiningCall(url));
          }}
        />
      )}
    </div>
  );
}
