import React from 'react';
import './UpdateNotification.css';

interface UpdateNotificationProps {
  show: boolean;
  onUpdate: () => void;
  onClose: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ show, onUpdate, onClose }) => {
  if (!show) return null;

  return (
    <div className="update-notification">
      <div className="update-notification__content">
        <p className="update-notification__text">新しいバージョンが利用可能です</p>
        <p className="update-notification__subtext">最新の機能を利用するには更新してください</p>
      </div>
      <div className="update-notification__actions">
        <button className="update-notification__button" onClick={onUpdate}>
          更新する
        </button>
        <button className="update-notification__close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;
