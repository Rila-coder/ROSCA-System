'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import GroupCreationForm from '@/components/groups/GroupCreationForm';
import LoadingWrapper from '@/components/layout/LoadingWrapper';

export default function CreateGroupPage() {
  // Track the current step to update the UI progress bar
  const [currentStep, setCurrentStep] = useState(1);

  // Handler to receive step updates from the form component
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <LoadingWrapper pageTitle="Loading Create Group">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            Create New Group
          </h1>
          <p className="text-text/60 text-sm sm:text-base">
            Set up a new rotating savings group. You can assign yourself or another member as the leader.
          </p>
        </div>

        {/* Progress Steps Indicator - Scrollable on mobile */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {[
              'Group Details', 
              'Add Members', 
              'Leader & Numbers', // Shortened for mobile
              'Review'
            ].map((stepLabel, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;
              
              return (
                <div key={stepLabel} className="flex items-center shrink-0">
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm sm:text-base transition-colors duration-300 ${
                      isActive || isCompleted
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-text/40'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} className="sm:w-4 sm:h-4" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  <div
                    className={`ml-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors duration-300 ${
                      isActive ? 'text-primary font-bold' : isCompleted ? 'text-text' : 'text-text/40'
                    }`}
                  >
                    {stepLabel}
                  </div>
                  {/* Connector Line */}
                  {index < 3 && (
                    <div
                      className={`w-4 sm:w-8 md:w-16 h-0.5 mx-2 sm:mx-3 transition-colors duration-300 ${
                        isCompleted ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Description Text - visible on mobile mostly */}
          <p className="text-xs sm:text-sm text-text/60 font-medium">
            Step {currentStep} of 4:
            <span className="text-text/80 ml-1">
              {currentStep === 1 && 'Basic Information'}
              {currentStep === 2 && 'Membership Management'}
              {currentStep === 3 && 'Assign Roles & Numbers'}
              {currentStep === 4 && 'Final Review'}
            </span>
          </p>
        </div>

        {/* Main Form Component */}
        <GroupCreationForm onStepChange={handleStepChange} />
      </div>
    </LoadingWrapper>
  );
}