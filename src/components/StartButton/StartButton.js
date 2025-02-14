import React from 'react';
import './StartButton.css';

/**
 * Props:
 * - asOwner: boolean
 * - disabled: boolean
 * - onClick: () => ()
 */
export default function StartButton(props) {
  return (
    <button
      className="start-button"
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {`Click to join as ${props.asOwner ? 'owner' : 'regular participant'}`}
    </button>
  );
}
