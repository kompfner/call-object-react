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

console.log(
  `[pk] track state debugging globals

  localStorage flags:
  - joinInputs ('custom'|'false', or remove)
  - joinSFU ('true' or remove)
  - logTracks ('remote'|'local', or remove)

  functions:
  - setInputAudio('custom'|false|'default')
  - setInputVideo('custom'|false|'default')
  - muteAudio()
  - unmuteAudio()
  - muteVideo()
  - unmuteVideo()`
);

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
  const startJoiningCall = useCallback(async (url) => {
    const newCallObject = DailyIframe.createCallObject();
    setRoomUrl(url);
    setCallObject(newCallObject);
    setAppState(STATE_JOINING);

    // Join
    switch (localStorage.getItem('joinInputs')) {
      case 'custom':
        console.log('[pk] joining with custom inputs');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        await newCallObject.join({
          url,
          videoSource: videoTrack,
          audioSource: audioTrack,
        });
        break;
      case 'false':
        console.log('[pk] joining with false inputs');
        await newCallObject.join({
          url,
          videoSource: false,
          audioSource: false,
        });
        break;
      default:
        console.log('[pk] joining with default inputs');
        await newCallObject.join({ url });
        break;
    }

    // Switch to SFU right away
    switch (localStorage.getItem('joinSFU')) {
      case 'true':
        console.log('[pk] switching to SFU post-join...');
        await newCallObject.setNetworkTopology({ topology: 'sfu' });
        break;
      default:
        console.log('[pk] not switching to SFU post-join...');
        break;
    }

    newCallObject.join({ url });
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
   * Uncomment to attach call object to window for debugging purposes.
   */
  useEffect(() => {
    window.callObject = callObject;

    window.logRemoteTracks = () => {
      for (const [id, participant] of Object.entries(
        callObject.participants()
      )) {
        if (id !== 'local') {
          const trackStates = participant.tracks;
          console.log('[pk] remote tracks: ', {
            audioSummary: trackStates.audio.state,
            audio: trackStates.audio,
            videoSummary: trackStates.video.state,
            video: trackStates.video,
          });
        }
      }
    };

    window.logLocalTracks = () => {
      if (callObject.participants().local) {
        const trackStates = callObject.participants().local.tracks;
        console.log('[pk] local tracks: ', {
          audioSummary: trackStates.audio.state,
          audio: trackStates.audio,
          videoSummary: trackStates.video.state,
          video: trackStates.video,
        });
      }
    };

    window.setInputAudio = async (audio) => {
      switch (audio) {
        case 'custom':
          console.log('[pk] setting custom input audio...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          const audioTrack = stream.getAudioTracks()[0];
          callObject.setInputDevicesAsync({ audioSource: audioTrack });
          break;
        case false:
          console.log('[pk] setting false input audio...');
          callObject.setInputDevicesAsync({ audioSource: false });
          break;
        case 'default':
          console.log('[pk] setting default input audio...');
          callObject.setInputDevicesAsync({ audioDeviceId: 'default' });
          break;
        default:
          break;
      }
    };

    window.setInputVideo = async (video) => {
      switch (video) {
        case 'custom':
          console.log('[pk] setting custom input video...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          const videoTrack = stream.getVideoTracks()[0];
          callObject.setInputDevicesAsync({ videoSource: videoTrack });
          break;
        case false:
          console.log('[pk] setting false input video...');
          callObject.setInputDevicesAsync({ videoSource: false });
          break;
        case 'default':
          console.log('[pk] setting default input video...');
          const devices = (await callObject.enumerateDevices()).devices;
          const defaultDevice = devices.find(
            (deviceInfo) => deviceInfo.kind === 'videoinput'
          );
          console.log(`[pk] (video deviceId: ${defaultDevice.deviceId}`);
          callObject.setInputDevicesAsync({
            videoDeviceId: defaultDevice.deviceId,
          });
          break;
        default:
          break;
      }
    };

    window.muteAudio = () => {
      callObject.setLocalAudio(false);
    };

    window.unmuteAudio = () => {
      callObject.setLocalAudio(true);
    };

    window.muteVideo = () => {
      callObject.setLocalVideo(false);
    };

    window.unmuteVideo = () => {
      callObject.setLocalVideo(true);
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
   * Listen for app messages from other call participants.
   */
  useEffect(() => {
    if (!callObject) {
      return;
    }

    function handleAppMessage(event) {
      if (event) {
        logDailyEvent(event);
        console.log(`received app message from ${event.fromId}: `, event.data);
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
