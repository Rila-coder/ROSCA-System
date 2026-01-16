'use client';

import { useState, useEffect } from 'react';
import { 
  Shuffle, Settings, RefreshCw, Lock, Unlock,
  Save, ArrowUpDown, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface NumberDrawProps {
  members: Member[];
  numberAssignmentMethod: 'random' | 'manual';
  setNumberAssignmentMethod: (method: 'random' | 'manual') => void;
  assignedNumbers: Record<string, number>;
  setAssignedNumbers: (numbers: Record<string, number>) => void;
}

export default function NumberDraw({
  members,
  numberAssignmentMethod,
  setNumberAssignmentMethod,
  assignedNumbers,
  setAssignedNumbers,
}: NumberDrawProps) {
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [tempNumber, setTempNumber] = useState('');

  useEffect(() => {
    if (numberAssignmentMethod === 'random' && members.length > 0) {
      assignRandomNumbers();
    }
  }, []);

  const assignRandomNumbers = () => {
    const shuffled = [...members].sort(() => Math.random() - 0.5);
    const newAssignedNumbers: Record<string, number> = {};
    
    shuffled.forEach((member, index) => {
      newAssignedNumbers[member.id] = index + 1;
    });
    
    setAssignedNumbers(newAssignedNumbers);
    toast.success('Numbers assigned randomly');
  };

  const handleManualAssign = (memberId: string, number: number) => {
    const isNumberTaken = Object.values(assignedNumbers).includes(number);
    const currentMemberNumber = assignedNumbers[memberId];
    
    if (isNumberTaken && currentMemberNumber !== number) {
      toast.error(`Number ${number} is already assigned to another member`);
      return;
    }
    
    if (number < 1 || number > members.length) {
      toast.error(`Number must be between 1 and ${members.length}`);
      return;
    }
    
    setAssignedNumbers({
      ...assignedNumbers,
      [memberId]: number,
    });
    
    setEditingNumber(null);
  };

  const startEditing = (memberId: string) => {
    if (numberAssignmentMethod === 'random') {
      toast.error('Switch to manual mode to edit numbers');
      return;
    }
    setEditingNumber(memberId);
    setTempNumber(assignedNumbers[memberId]?.toString() || '');
  };

  const saveEdit = (memberId: string) => {
    const num = parseInt(tempNumber);
    if (isNaN(num)) {
      toast.error('Please enter a valid number');
      return;
    }
    handleManualAssign(memberId, num);
  };

  const swapNumbers = (memberId1: string, memberId2: string) => {
    const num1 = assignedNumbers[memberId1];
    const num2 = assignedNumbers[memberId2];
    
    setAssignedNumbers({
      ...assignedNumbers,
      [memberId1]: num2,
      [memberId2]: num1,
    });
    
    toast.success('Numbers swapped successfully');
  };

  const validateAssignment = () => {
    const assigned = Object.values(assignedNumbers);
    const uniqueNumbers = new Set(assigned);
    
    if (assigned.length !== members.length) {
      return { valid: false, message: 'Not all members have numbers assigned' };
    }
    
    if (uniqueNumbers.size !== members.length) {
      return { valid: false, message: 'Duplicate numbers found' };
    }
    
    for (let i = 1; i <= members.length; i++) {
      if (!assigned.includes(i)) {
        return { valid: false, message: `Number ${i} is missing` };
      }
    }
    
    return { valid: true, message: 'All numbers assigned correctly' };
  };

  const validation = validateAssignment();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Method Selection */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text text-sm sm:text-base">Number Assignment Method</h3>
          <Settings size={18} className="text-text/40" />
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => {
              setNumberAssignmentMethod('random');
              assignRandomNumbers();
            }}
            className={`p-3 sm:p-4 border rounded-lg transition-all flex items-center space-x-2 ${
              numberAssignmentMethod === 'random'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-300 hover:border-primary/30'
            }`}
          >
            <Shuffle size={20} className="flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="font-medium text-sm sm:text-base">Random Draw</div>
              <div className="text-xs sm:text-sm text-text/60">System randomly assigns numbers</div>
            </div>
          </button>
          
          <button
            onClick={() => setNumberAssignmentMethod('manual')}
            className={`p-3 sm:p-4 border rounded-lg transition-all flex items-center space-x-2 ${
              numberAssignmentMethod === 'manual'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-300 hover:border-primary/30'
            }`}
          >
            <Settings size={20} className="flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="font-medium text-sm sm:text-base">Manual Assignment</div>
              <div className="text-xs sm:text-sm text-text/60">You assign numbers manually</div>
            </div>
          </button>
        </div>
        
        {numberAssignmentMethod === 'random' && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={assignRandomNumbers}
              className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center space-x-2 text-sm sm:text-base"
            >
              <RefreshCw size={16} />
              <span>Re-draw Numbers</span>
            </button>
          </div>
        )}
      </div>

      {/* Assignment Status */}
      <div className={`p-3 sm:p-4 rounded-lg border ${
        validation.valid 
          ? 'bg-success/10 border-success/20' 
          : 'bg-accent/10 border-accent/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            {validation.valid ? (
              <Lock size={18} className="text-success flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-accent flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-medium text-sm sm:text-base truncate">
                {validation.valid ? 'Numbers Assigned' : 'Action Required'}
              </div>
              <div className="text-xs sm:text-sm truncate">
                {validation.message}
              </div>
            </div>
          </div>
          
          {!validation.valid && (
            <button
              onClick={() => {
                if (numberAssignmentMethod === 'random') {
                  assignRandomNumbers();
                } else {
                  const usedNumbers = new Set(Object.values(assignedNumbers));
                  const missingNumbers = Array.from(
                    { length: members.length }, 
                    (_, i) => i + 1
                  ).filter(num => !usedNumbers.has(num));
                  
                  let newAssignedNumbers = { ...assignedNumbers };
                  let missingIndex = 0;
                  
                  members.forEach(member => {
                    if (!newAssignedNumbers[member.id]) {
                      newAssignedNumbers[member.id] = missingNumbers[missingIndex];
                      missingIndex++;
                    }
                  });
                  
                  setAssignedNumbers(newAssignedNumbers);
                  toast.success('Missing numbers assigned automatically');
                }
              }}
              className="px-2 sm:px-3 py-1 bg-primary text-white rounded text-xs sm:text-sm hover:bg-primary-dark ml-2 flex-shrink-0"
            >
              Auto-fix
            </button>
          )}
        </div>
      </div>

      {/* Numbers Grid - Responsive */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
          <h3 className="font-medium text-text text-sm sm:text-base">Member Numbers</h3>
          <div className="text-xs sm:text-sm text-text/60">
            {Object.keys(assignedNumbers).length} of {members.length} assigned
          </div>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <AlertCircle className="mx-auto text-gray-400" size={32} />
            <p className="text-text/60 mt-2 text-sm sm:text-base">No members to assign numbers</p>
            <p className="text-xs sm:text-sm text-text/40">Add members in previous step</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((member, index) => {
              const assignedNumber = assignedNumbers[member.id];
              const isEditing = editingNumber === member.id;
              
              return (
                <div 
                  key={member.id} 
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm sm:text-base">
                          {assignedNumber || '?'}
                        </span>
                      </div>
                      <div className="font-medium text-sm sm:text-base truncate">{member.name}</div>
                    </div>
                    
                    {numberAssignmentMethod === 'manual' && (
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => startEditing(member.id)}
                          className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                          title="Edit number"
                        >
                          <Settings size={14} />
                        </button>
                        {index > 0 && (
                          <button
                            onClick={() => swapNumbers(member.id, members[index - 1].id)}
                            className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
                            title="Swap with previous"
                          >
                            <ArrowUpDown size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs sm:text-sm text-text/60 truncate">{member.email}</div>
                  <div className="text-xs sm:text-sm text-text/60">{member.phone}</div>
                  
                  {isEditing ? (
                    <div className="mt-3 flex space-x-2">
                      <input
                        type="number"
                        value={tempNumber}
                        onChange={(e) => setTempNumber(e.target.value)}
                        className="input-field flex-1 text-sm"
                        min="1"
                        max={members.length}
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(member.id)}
                        className="px-2 sm:px-3 py-1.5 bg-primary text-white rounded text-xs sm:text-sm hover:bg-primary-dark flex-shrink-0"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <div className="text-xs text-text/40">
                        Click {numberAssignmentMethod === 'manual' ? 'edit' : 'lock'} to change
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend - Responsive */}
      <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary/20 border border-primary flex-shrink-0"></div>
          <span className="text-text/60">Assigned number</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 flex-shrink-0"></div>
          <span className="text-text/60">Not assigned</span>
        </div>
        <div className="flex items-center space-x-2">
          <Lock size={12} className="text-success flex-shrink-0" />
          <span className="text-text/60">Locked (random)</span>
        </div>
        <div className="flex items-center space-x-2">
          <Unlock size={12} className="text-accent flex-shrink-0" />
          <span className="text-text/60">Editable (manual)</span>
        </div>
      </div>
    </div>
  );
}