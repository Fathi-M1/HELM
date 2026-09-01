import React from 'react';
import { SystemNotification } from '../types';
import { Bell, X, Activity } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onMarkAllRead: () => void;
  onSelectNotification: (notif: SystemNotification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#03080a]/80 backdrop-blur-md flex items-start justify-end p-6 pt-16 select-none animate-fade-in">
      <div className="bg-[#050d10] border border-[#1e313a] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#1e313a]/50 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#fcba62]" />
            <h3 className="text-xs font-semibold text-[#dee4e3] font-mono-data uppercase tracking-wider">
              System Telemetry Alerts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b8584] hover:text-[#dee4e3] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-between items-center text-xs font-mono-data">
          <span className="text-[#6b8584]">{notifications.length} Incoming Feeds</span>
          <button
            onClick={onMarkAllRead}
            className="text-[#60d8d8] hover:underline"
          >
            Mark all read
          </button>
        </div>

        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                onSelectNotification(notif);
                onClose();
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                notif.unread
                  ? 'bg-[#0a171c] border-[#60d8d8]/50 shadow-sm'
                  : 'bg-[#050d10] border-[#1e313a]/40 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono-data text-[#fcba62]">
                  {notif.timestamp} • {notif.nodeId}
                </span>
                {notif.unread && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60d8d8] animate-ping" />
                )}
              </div>
              <h4 className="text-xs font-semibold text-[#dee4e3] mb-1">{notif.title}</h4>
              <p className="text-[11px] text-[#9ab3b2] leading-relaxed font-light">{notif.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
