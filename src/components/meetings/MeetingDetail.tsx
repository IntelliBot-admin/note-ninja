import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useMeetingStore } from '../store/meetingStore';
import { useCategories } from '../hooks/useCategories';
import { Mic, Link2, CheckSquare, Edit2, Check, X, Tag, Upload } from 'lucide-react';
import AudioRecorder from '../recorder/AudioRecorder';
import AudioUploader from '../upload/AudioUploader';
import ResourceManager from '../resources/ResourceManager';
import ActionItemList from '../actionItems/ActionItemList';
import { Meeting, MeetingType } from '../types/meeting';
import toast from 'react-hot-toast';

const meetingTools = [
  { icon: Mic, label: 'Record', shortLabel: 'Record', action: 'record' },
  { icon: Upload, label: 'MP3 Upload', shortLabel: 'Upload', action: 'upload' },
  { icon: Link2, label: 'Files & URLs', shortLabel: 'Files', action: 'files' },
  { icon: CheckSquare, label: 'Action Items', shortLabel: 'Tasks', action: 'actions' }
];

// Rest of the file remains unchanged