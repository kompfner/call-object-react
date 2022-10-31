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
      dailyConfig: { experimentalChromeVideoMuteLightOff: true },
    });
    setRoomUrl(url);
    setCallObject(newCallObject);
    setAppState(STATE_JOINING);
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
    if (!callObject) return;
    window.callObject = callObject;

    const wait = async (ms) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, ms);
      });
    };

    // TODO: ensure that the below can work without waiting 5s in between

    /**
     * Prereqs:
     * - revoke browser cam permission
     *
     * Test:
     * - start with cam and mic off
     * - unmute video (should error and mark cam as blocked)
     * - mute video (should prevent re-gUMming it in the future)
     * - unmute audio (should succeed)
     * - toggle audio off and on (should succeed)
     *
     */
    const testUnmuteBlocked_Video = async () => {
      console.log('[pk] start with cam and mic off');
      await callObject.startCamera({
        startVideoOff: true,
        startAudioOff: true,
      });

      await wait(5000);
      console.log('[pk] unmute video (should error and mark cam as blocked)');
      await callObject.setLocalVideo(true);

      await wait(5000);
      console.log(
        '[pk] mute video (should prevent re-gUMming it in the future)'
      );
      await callObject.setLocalVideo(false);

      await wait(5000);
      console.log('[pk] unmute audio (should succeed)');
      await callObject.setLocalAudio(true);

      await wait(5000);
      console.log('[pk] toggle audio off and on (should succeed)');
      await callObject.setLocalAudio(false);
      await wait(5000);
      await callObject.setLocalAudio(true);

      // TODO: if we now setLocalVideo(true), it will result in *both* cam and
      // mic being marked as blocked. But we can still recover by doing a
      // setLocalVideo(false) and re-toggling audio.
    };

    /**
     * Prereqs:
     * - revoke browser mic permission
     *
     * Test:
     * - start with cam and mic off
     * - unmute audio (should error and mark mic as blocked)
     * - mute audio (should prevent re-gUMming it in the future)
     * - unmute video (should succeed)
     * - toggle video off and on (should succeed)
     *
     */
    const testUnmuteBlocked_Audio = async () => {
      console.log('[pk] start with cam and mic off');
      await callObject.startCamera({
        startVideoOff: true,
        startAudioOff: true,
      });

      await wait(5000);
      console.log('[pk] unmute audio (should error and mark mic as blocked)');
      await callObject.setLocalAudio(true);

      await wait(5000);
      console.log(
        '[pk] mute audio (should prevent re-gUMming it in the future)'
      );
      await callObject.setLocalAudio(false);

      await wait(5000);
      console.log('[pk] unmute video (should succeed)');
      await callObject.setLocalVideo(true);

      await wait(5000);
      console.log('[pk] toggle video off and on (should succeed)');
      await callObject.setLocalVideo(false);
      await wait(5000);
      await callObject.setLocalVideo(true);

      // TODO: if we now setLocalAudio(true), it will result in *both* cam and
      // mic being marked as blocked. But we can still recover by doing a
      // setLocalAudio(false) and re-toggling video.
    };

    /**
     * Prereqs:
     * - revoke browser cam permission
     *
     * Test:
     * - start with cam and mic off
     * - unmute audio (should succeed)
     * - unmute video (should error and mark cam as blocked; will also mark mic as blocked)
     * - mute video (should prevent re-gUMming it in the future)
     * - unmute audio again (should succeed)
     *
     */
    const testUnmuteBlockedSecond_Video = async () => {
      console.log('[pk] start with cam and mic off');
      await callObject.startCamera({
        startVideoOff: true,
        startAudioOff: true,
      });

      await wait(5000);
      console.log('[pk] unmute audio (should succeed)');
      await callObject.setLocalAudio(true);

      await wait(5000);
      console.log(
        '[pk] unmute video (should error and mark cam as blocked; will also mark mic as blocked)'
      );
      await callObject.setLocalVideo(true);

      await 5000;
      console.log(
        '[pk] mute video (should prevent re-gUMming it in the future)'
      );
      await callObject.setLocalVideo(false);

      await wait(5000);
      console.log('[pk] unmute audio again (should succeed)');
      await callObject.setLocalAudio(true);

      // TODO: if we now setLocalVideo(true), it will result in *both* cam and
      // mic being marked as blocked. But we can still recover by doing a
      // setLocalVideo(false) and re-toggling audio.
    };

    /**
     * Prereqs:
     * - revoke browser mic permission
     *
     * Test:
     * - start with cam and mic off
     * - unmute video (should succeed)
     * - unmute audio (should error and mark cam as blocked; will also mark mic as blocked)
     * - mute audio (should prevent re-gUMming it in the future)
     * - unmute video again (should succeed)
     *
     */
    const testUnmuteBlockedSecond_Audio = async () => {
      console.log('[pk] start with cam and mic off');
      await callObject.startCamera({
        startVideoOff: true,
        startAudioOff: true,
      });

      await wait(5000);
      console.log('[pk] unmute video (should succeed)');
      await callObject.setLocalVideo(true);

      await wait(5000);
      console.log(
        '[pk] unmute audio (should error and mark cam as blocked; will also mark mic as blocked)'
      );
      await callObject.setLocalAudio(true);

      await 5000;
      console.log(
        '[pk] mute audio (should prevent re-gUMming it in the future)'
      );
      await callObject.setLocalAudio(false);

      await wait(5000);
      console.log('[pk] unmute video again (should succeed)');
      await callObject.setLocalVideo(true);

      // TODO: if we now setLocalVideo(true), it will result in *both* cam and
      // mic being marked as blocked. But we can still recover by doing a
      // setLocalVideo(false) and re-toggling audio.
    };

    window.startPattern = async () => {
      // const callObject = (callObject as import('@daily-co/daily-js').DailyCall);

      await callObject.startCamera({
        startVideoOff: true,
        startAudioOff: true,
      });

      // try turning on devices one at a time...

      let wantsVideoOn = false;
      let wantsAudioOn = false;

      const handleVideoEnableAttempt = (event) => {
        if (!event.participant.local) {
          return;
        }
        if (event.participant.tracks.video.state === 'blocked') {
          // video was denied permission; turn it off so we don't try to gUM it when turning on audio
          callObject.setLocalVideo(false);
          callObject.off('participant-updated', handleVideoEnableAttempt);
          // re-enable local audio if needed (in case it was erroneously marked blocked along with video)
          if (wantsAudioOn) {
            callObject.setLocalAudio(true);
          }
        } else if (event.participant.tracks.video.state === 'playable') {
          // video worked!
          callObject.off('participant-updated', handleVideoEnableAttempt);
        }
      };

      const handleAudioEnableAttempt = (event) => {
        if (!event.participant.local) {
          return;
        }
        if (event.participant.tracks.audio.state === 'blocked') {
          // audio was denied permission; turn it off so we don't try to gUM it when turning on audio
          callObject.setLocalAudio(false);
          callObject.off('participant-updated', handleAudioEnableAttempt);
          // re-enable local video if needed (in case it was erroneously marked blocked along with audio)
          if (wantsVideoOn) {
            callObject.setLocalVideo(true);
          }
        } else if (event.participant.tracks.audio.state === 'playable') {
          // audio worked!
          callObject.off('participant-updated', handleAudioEnableAttempt);
        }
      };

      // // start with video
      // wantsVideoOn = true;
      // callObject.on('participant-updated', handleVideoEnableAttempt);
      // callObject.setLocalVideo(true);

      // // then do audio
      // setTimeout(() => {
      //   wantsAudioOn = true;
      //   callObject.on('participant-updated', handleAudioEnableAttempt);
      //   callObject.setLocalAudio(true);
      // }, 5000);

      // start with audio
      wantsAudioOn = true;
      callObject.on('participant-updated', handleAudioEnableAttempt);
      callObject.setLocalAudio(true);

      // then do video
      setTimeout(() => {
        wantsVideoOn = true;
        callObject.on('participant-updated', handleVideoEnableAttempt);
        callObject.setLocalVideo(true);
      }, 5000);
    };

    /**
     * Prereqs:
     * - ensure both devices have permission
     *
     * Test:
     * - start with cam and mic off
     * - unmute video
     * - unmute audio
     * - toggle video
     * - toggle audio
     *
     */
    const testNormal_StartingWithVideo = async () => {};

    /**
     * Prereqs:
     * - ensure both devices have permission
     *
     * Test:
     * - start with cam and mic off
     * - unmute video
     * - unmute audio
     * - toggle video
     * - toggle audio
     *
     */
    const testNormal_StartingWithAudio = async () => {};

    /**
     * Prereqs:
     * - revoke browser cam permission
     *
     * Test:
     * - start with mic off (should error and mark cam as blocked)
     * - mute video (should prevent re-gUMming it in the future)
     * - unmute audio (should succeed)
     * - toggle audio off and on (should succeed)
     *
     */
    // const testStartBlocked_Video = async () => {
    //   console.log(
    //     '[pk] start with mic off (should error and mark cam as blocked)'
    //   );
    //   await callObject.startCamera({
    //     startVideoOff: false,
    //     startAudioOff: true,
    //   });

    //   await wait(5000);
    //   console.log(
    //     '[pk] mute video (should prevent re-gUMming it in the future)'
    //   );
    //   await callObject.setLocalVideo(false);

    //   await wait(5000);
    //   console.log('[pk] unmute audio (should succeed)');
    //   await callObject.setLocalAudio(true);

    //   await wait(5000);
    //   console.log('[pk] toggle audio off and on (should succeed)');
    //   await callObject.setLocalAudio(false);
    //   await wait(5000);
    //   await callObject.setLocalAudio(true);
    // };

    /**
     * Prereqs:
     * - revoke browser cam permission
     * - apply commit in startcamera-with-devices-off-option-1
     *
     * - startCamera() with cam and mic sources disabled
     * - wait
     * - setLocalVideo(true) (error)
     * - wait
     * - setLocalAudio(true) (we *want* this to succeed)
     *
     */
    // const test2 = async () => {
    //   console.log('[pk] startCamera...');
    //   await callObject.startCamera({
    //     videoSource: false,
    //     audioSource: false,
    //   });
    //   await wait(5000);
    //   console.log('[pk] setInputDevicesAsync (enabling video)...');
    //   await callObject.setInputDevicesAsync({
    //     videoDeviceId: '',
    //     audioDeviceId: false,
    //   });
    //   await wait(5000);
    //   console.log('[pk] setInputDevicesAsync (enabling audio)...');
    //   await callObject.setLocalAudio({
    //     audioDeviceId: '',
    //     videoDeviceId: false,
    //   });
    // };

    window.test = testUnmuteBlockedSecond_Video;

    // window.videoState = '';
    // window.audioState = '';

    // window.start = () => {
    //   callObject.startCamera({
    //     startAudioOff: true,
    //     startVideoOff: true,
    //     videoSource: false,
    //     audioSource: false,
    //   });
    // };

    // window.toggleVideo = async () => {
    //   if (window.videoState === '') {
    //     try {
    //       const width = 1280;
    //       const height = 720;
    //       const stream = await window.navigator.mediaDevices.getUserMedia({
    //         // TODO: flesh out Daily's default constraints here
    //         video: {
    //           aspectRatio: { min: 1.77 },
    //           width: { ideal: width, max: width },
    //           height: { ideal: height, max: height },
    //           facingMode: { ideal: 'user' },
    //         },
    //       });
    //       const track = stream.getVideoTracks()[0];
    //       await callObject.setInputDevicesAsync({ videoSource: track });
    //       window.videoState = 'available';
    //     } catch (e) {
    //       window.videoState = 'blocked';
    //       console.error('something went wrong with starting video');
    //     }
    //   }

    //   if (window.videoState === 'available') {
    //     callObject.setLocalVideo(!callObject.localVideo());
    //   }
    // };

    // window.toggleAudio = async () => {
    //   if (window.audioState === '') {
    //     try {
    //       const stream = await window.navigator.mediaDevices.getUserMedia({
    //         // TODO: flesh out Daily's default constraints here
    //         audio: true,
    //       });
    //       const track = stream.getAudioTracks()[0];
    //       await callObject.setInputDevicesAsync({ audioSource: track });
    //       window.audioState = 'available';
    //     } catch (e) {
    //       window.audioState = 'blocked';
    //       console.error('something went wrong with starting audio');
    //     }
    //   }

    //   if (window.audioState === 'available') {
    //     callObject.setLocalAudio(!callObject.localAudio());
    //   }
    // };

    window.start = () => {
      callObject.startCamera({ startVideoOff: true, startAudioOff: true });
    };

    window.camOn = () => {
      callObject.setLocalVideo(true);
    };

    window.camOff = () => {
      callObject.setLocalVideo(false);
    };

    window.micOn = () => {
      callObject.setLocalAudio(true);
    };

    window.micOff = () => {
      callObject.setLocalAudio(false);
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
