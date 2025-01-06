import React, { useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Mic, Volume2 } from 'lucide-react';

const STORED_MIC_KEY = 'preferred_microphone_id';
const STORED_SPEAKER_KEY = 'preferred_speaker_id';

interface DeviceSelectDialogProps {
   isOpen: boolean;
   onClose: () => void;
   onConfirm: (microphoneId: string, speakerId: string) => void;
   audioInputDevices: MediaDeviceInfo[];
   audioOutputDevices: MediaDeviceInfo[];
}

export default function DeviceSelectDialog({
   isOpen,
   onClose,
   onConfirm,
   audioInputDevices,
   audioOutputDevices,
}: DeviceSelectDialogProps) {
   const [selectedMicId, setSelectedMicId] = React.useState<string>('');
   const [selectedSpeakerId, setSelectedSpeakerId] = React.useState<string>('');

   // Set default devices and load stored preferences
   useEffect(() => {
      if (!audioInputDevices.length || !audioOutputDevices.length) return;

      // Load stored preferences
      const storedMicId = localStorage.getItem(STORED_MIC_KEY) || '';
      const storedSpeakerId = localStorage.getItem(STORED_SPEAKER_KEY) || '';

      // Find default devices
      const defaultMic = audioInputDevices.find(device => device.deviceId === 'default') || audioInputDevices[0];
      const defaultSpeaker = audioOutputDevices.find(device => device.deviceId === 'default') || audioOutputDevices[0];

      // Set microphone: stored preference > default device > first available device
      const micToUse = storedMicId && audioInputDevices.find(device => device.deviceId === storedMicId)
         ? storedMicId 
         : defaultMic.deviceId;

      // Set speaker: stored preference > default device > first available device
      const speakerToUse = storedSpeakerId && audioOutputDevices.find(device => device.deviceId === storedSpeakerId)
         ? storedSpeakerId
         : defaultSpeaker.deviceId;

      setSelectedMicId(micToUse);
      setSelectedSpeakerId(speakerToUse);
   }, [audioInputDevices, audioOutputDevices]);

   const handleConfirm = () => {
      // Save preferences to localStorage
      localStorage.setItem(STORED_MIC_KEY, selectedMicId);
      localStorage.setItem(STORED_SPEAKER_KEY, selectedSpeakerId);
      onConfirm(selectedMicId, selectedSpeakerId);
   };

   const getDeviceLabel = (device: MediaDeviceInfo) => {
      return device.deviceId === 'default' 
         ? `${device.label} (System Default)` 
         : device.label;
   };

   return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
         <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
         <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
               <Dialog.Title className="text-lg font-medium mb-4">Select Audio Devices</Dialog.Title>

               <div className="space-y-4">
                  <div>
                     <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Mic className="w-4 h-4" />
                        Microphone
                     </label>
                     <select
                        className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                        value={selectedMicId}
                        onChange={(e) => setSelectedMicId(e.target.value)}
                     >
                        <option value="">Select microphone...</option>
                        {audioInputDevices.map((device) => (
                           <option key={device.deviceId} value={device.deviceId}>
                              {getDeviceLabel(device)}
                           </option>
                        ))}
                     </select>
                  </div>

                  <div>
                     <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Volume2 className="w-4 h-4" />
                        System Audio
                     </label>
                     <select
                        className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
                        value={selectedSpeakerId}
                        onChange={(e) => setSelectedSpeakerId(e.target.value)}
                     >
                        <option value="">Select system audio...</option>
                        {audioOutputDevices.map((device) => (
                           <option key={device.deviceId} value={device.deviceId}>
                              {getDeviceLabel(device)}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>

               <div className="mt-6 flex justify-end gap-3">
                  <button
                     onClick={onClose}
                     className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={handleConfirm}
                     disabled={!selectedMicId || !selectedSpeakerId}
                     className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Start Recording
                  </button>
               </div>
            </Dialog.Panel>
         </div>
      </Dialog>
   );
}