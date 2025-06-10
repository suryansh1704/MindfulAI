interface DoctorSelectionProps {
  onSelectDoctor: (doctorId: string) => void;
}

const DoctorSelection = ({ onSelectDoctor }: DoctorSelectionProps) => {
  const doctors = [
    {
      id: 'Dr. Aarav',
      name: 'Dr. Aarav',
      specialization: 'Cognitive Behavioral Therapy',
      description: 'Specializes in anxiety, depression, and stress management with a gentle, solution-focused approach.',
      avatar: '👨‍⚕️',
      voice: 'Calm and reassuring male voice'
    },
    {
      id: 'Dr. Aarchi',
      name: 'Dr. Aarchi', 
      specialization: 'Mindfulness & Emotional Wellness',
      description: 'Expert in mindfulness-based therapy, helping with emotional regulation and personal growth.',
      avatar: '👩‍⚕️',
      voice: 'Warm and empathetic female voice'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {doctors.map((doctor) => (
        <div
          key={doctor.id}
          className="bg-white border border-slate-200 rounded-lg p-6 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-300"
          onClick={() => onSelectDoctor(doctor.id)}
        >
          <div className="flex items-start space-x-4">
            <div className="text-4xl">{doctor.avatar}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-medium text-slate-800">{doctor.name}</h3>
                <div className="text-sm text-slate-500">{doctor.voice}</div>
              </div>
              <p className="text-sm font-medium text-slate-600 mb-2">{doctor.specialization}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{doctor.description}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Click to start your session</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-slate-600">Available now</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="text-center mt-6 p-4 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600">
          Both therapists are AI-powered and provide the same level of professional care. 
          Choose based on your preference for voice and approach.
        </p>
      </div>
    </div>
  );
};

export default DoctorSelection; 