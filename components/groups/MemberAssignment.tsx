'use client';

import { useState } from 'react';
import { 
  UserPlus, X, Mail, Phone, User,
  Upload, Download 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface MemberAssignmentProps {
  members: Member[];
  setMembers: (members: Member[]) => void;
}

export default function MemberAssignment({ members, setMembers }: MemberAssignmentProps) {
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim() || !newMember.phone.trim()) {
      toast.error('Please fill all member details');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMember.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (newMember.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const isDuplicate = members.some(
      member => member.email === newMember.email || member.phone === newMember.phone
    );

    if (isDuplicate) {
      toast.error('Member with same email or phone already exists');
      return;
    }

    const member: Member = {
      id: Date.now().toString(),
      ...newMember,
    };

    setMembers([...members, member]);
    setNewMember({ name: '', email: '', phone: '' });
    toast.success('Member added successfully');
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(member => member.id !== id));
    toast.success('Member removed');
  };

  const handleImportMembers = () => {
    if (!importText.trim()) {
      toast.error('Please paste member data');
      return;
    }

    const lines = importText.split('\n').filter(line => line.trim());
    const importedMembers: Member[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length >= 3) {
        const [name, email, phone] = parts;
        
        if (name && email && phone) {
          importedMembers.push({
            id: `imported-${Date.now()}-${index}`,
            name,
            email,
            phone,
          });
        }
      }
    });

    if (importedMembers.length > 0) {
      const uniqueMembers = importedMembers.filter(
        imported => !members.some(
          existing => existing.email === imported.email || existing.phone === imported.phone
        )
      );

      if (uniqueMembers.length > 0) {
        setMembers([...members, ...uniqueMembers]);
        toast.success(`Added ${uniqueMembers.length} new members`);
        setImportMode(false);
        setImportText('');
      } else {
        toast.error('All imported members already exist');
      }
    } else {
      toast.error('No valid member data found. Format: Name,Email,Phone');
    }
  };

  const handleExportMembers = () => {
    const csvContent = members.map(member => 
      `${member.name},${member.email},${member.phone}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roasca-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Members exported successfully');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Add Member Form */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <h3 className="font-medium text-text mb-3 flex items-center text-sm sm:text-base">
          <UserPlus size={18} className="mr-2" />
          Add New Member
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-text/40" />
            </div>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({...newMember, name: e.target.value})}
              className="input-field w-full pl-10"
              placeholder="Full Name"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-text/40" />
            </div>
            <input
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember({...newMember, email: e.target.value})}
              className="input-field w-full pl-10"
              placeholder="Email Address"
            />
          </div>

          <div className="relative sm:col-span-2 lg:col-span-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={16} className="text-text/40" />
            </div>
            <input
              type="tel"
              value={newMember.phone}
              onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
              className="input-field w-full pl-10"
              placeholder="Phone Number"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAddMember}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm w-full sm:w-auto"
          >
            Add Member
          </button>
        </div>
      </div>

      {/* Import/Export Options - Responsive */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <button
          onClick={() => setImportMode(!importMode)}
          className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <Upload size={16} />
          <span className="text-sm sm:text-base">Import Members</span>
        </button>
        <button
          onClick={handleExportMembers}
          className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
        >
          <Download size={16} />
          <span className="text-sm sm:text-base">Export Members</span>
        </button>
      </div>

      {/* Import Textarea */}
      {importMode && (
        <div className="border border-gray-300 rounded-lg p-4">
          <h4 className="font-medium text-text mb-2 text-sm sm:text-base">Import Members (CSV Format)</h4>
          <p className="text-xs sm:text-sm text-text/60 mb-3">
            Enter member details in CSV format: Name,Email,Phone (one per line)
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="input-field w-full min-h-[120px] resize-none text-sm"
            placeholder="John Doe,john@example.com,9876543210&#10;Jane Smith,jane@example.com,9876543211"
          />
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 mt-3">
            <button
              onClick={() => setImportMode(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-text hover:bg-gray-50 text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleImportMembers}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm sm:text-base"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
          <h3 className="font-medium text-text text-sm sm:text-base">
            Members ({members.length})
          </h3>
          <span className="text-xs sm:text-sm text-text/60">
            Min: 2 members • Max: 100 members
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <User className="mx-auto text-gray-400" size={32} />
            <p className="text-text/60 mt-2 text-sm sm:text-base">No members added yet</p>
            <p className="text-xs sm:text-sm text-text/40">Add at least 2 members to continue</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary/30 transition-colors">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {/* Fixed: Remove sm:size prop, use a single size */}
                    <User className="text-primary w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-text text-sm sm:text-base truncate">{member.name}</div>
                    <div className="text-xs sm:text-sm text-text/60 truncate">
                      {member.email} • {member.phone}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-error ml-2 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Minimum Requirement Warning */}
        {members.length < 2 && members.length > 0 && (
          <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <p className="text-sm text-accent flex flex-col sm:flex-row sm:items-center">
              <span className="font-medium">Need {2 - members.length} more member(s)</span>
              <span className="hidden sm:inline mx-2">•</span>
              <span>Minimum 2 members required</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}