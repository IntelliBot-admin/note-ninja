{/* Previous code remains the same */}

{selectedRecording === recording.id && (
  <div className="mt-2">
    <AudioPlayer 
      audioUrl={recording.audioUrl} 
      initialDuration={recording.duration} // Pass the duration from recording
    />
    {recording.transcript && (
      <div className="mt-2 p-3 bg-white rounded border text-sm text-gray-600">
        {recording.transcript}
      </div>
    )}
  </div>
)}