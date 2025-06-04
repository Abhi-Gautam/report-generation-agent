'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ReportWizardProps {
  onSubmit: (data: {
    title: string;
    topic: string;
    reportType: string;
    academicLevel: string;
    fieldOfStudy?: string;
    wordLimit?: number;
    customSections?: string[];
  }) => void;
  isLoading: boolean;
  onCancel: () => void;
}

const steps = [
  { id: 1, title: 'Basic Information', description: 'Report title and topic' },
  { id: 2, title: 'Report Type', description: 'Choose your report style' },
  { id: 3, title: 'Academic Details', description: 'Level and field of study' },
  { id: 4, title: 'Structure', description: 'Customize sections and length' },
  { id: 5, title: 'Review', description: 'Confirm your settings' }
];

const reportTypes = [
  { id: 'research_paper', name: 'Research Paper', description: 'Academic research with methodology' },
  { id: 'literature_review', name: 'Literature Review', description: 'Analysis of existing research' },
  { id: 'case_study', name: 'Case Study', description: 'In-depth analysis of specific cases' },
  { id: 'thesis', name: 'Thesis/Dissertation', description: 'Comprehensive academic work' },
  { id: 'lab_report', name: 'Lab Report', description: 'Scientific experiment documentation' },
  { id: 'white_paper', name: 'White Paper', description: 'Professional industry report' }
];

const academicLevels = [
  { id: 'high_school', name: 'High School' },
  { id: 'undergraduate', name: 'Undergraduate' },
  { id: 'graduate', name: 'Graduate' },
  { id: 'doctoral', name: 'Doctoral' },
  { id: 'professional', name: 'Professional' }
];

export function ReportWizard({ onSubmit, isLoading, onCancel }: ReportWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    reportType: '',
    academicLevel: '',
    fieldOfStudy: '',
    wordLimit: 5000,
    customSections: [] as string[]
  });

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() && formData.topic.trim();
      case 2:
        return formData.reportType;
      case 3:
        return formData.academicLevel;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Enter your report title"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Research Topic *
              </label>
              <textarea
                value={formData.topic}
                onChange={(e) => updateFormData({ topic: e.target.value })}
                placeholder="Describe what your report will cover"
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Choose Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`p-4 cursor-pointer border-2 transition-colors ${
                    formData.reportType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData({ reportType: type.id })}
                >
                  <h4 className="font-medium text-gray-900">{type.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  {formData.reportType === type.id && (
                    <Check className="w-5 h-5 text-blue-600 mt-2" />
                  )}
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Academic Level *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {academicLevels.map((level) => (
                  <Card
                    key={level.id}
                    className={`p-3 cursor-pointer border-2 transition-colors ${
                      formData.academicLevel === level.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => updateFormData({ academicLevel: level.id })}
                  >
                    <div className="text-center">
                      <span className="font-medium">{level.name}</span>
                      {formData.academicLevel === level.id && (
                        <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field of Study (Optional)
              </label>
              <input
                type="text"
                value={formData.fieldOfStudy}
                onChange={(e) => updateFormData({ fieldOfStudy: e.target.value })}
                placeholder="e.g., Computer Science, Biology, Psychology"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Word Count
              </label>
              <select
                value={formData.wordLimit}
                onChange={(e) => updateFormData({ wordLimit: parseInt(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1000}>Short (1,000 words)</option>
                <option value={2500}>Medium (2,500 words)</option>
                <option value={5000}>Standard (5,000 words)</option>
                <option value={10000}>Long (10,000 words)</option>
                <option value={20000}>Extended (20,000+ words)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Sections (Optional)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Leave empty to use the standard structure for your report type
              </p>
              <textarea
                value={formData.customSections.join('\n')}
                onChange={(e) => updateFormData({ 
                  customSections: e.target.value.split('\n').filter(s => s.trim()) 
                })}
                placeholder="Enter custom section names, one per line"
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 5:
        const selectedReportType = reportTypes.find(t => t.id === formData.reportType);
        const selectedAcademicLevel = academicLevels.find(l => l.id === formData.academicLevel);
        
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Review Your Report Settings</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <span className="font-medium">Title:</span> {formData.title}
              </div>
              <div>
                <span className="font-medium">Topic:</span> {formData.topic}
              </div>
              <div>
                <span className="font-medium">Type:</span> {selectedReportType?.name}
              </div>
              <div>
                <span className="font-medium">Academic Level:</span> {selectedAcademicLevel?.name}
              </div>
              {formData.fieldOfStudy && (
                <div>
                  <span className="font-medium">Field:</span> {formData.fieldOfStudy}
                </div>
              )}
              <div>
                <span className="font-medium">Target Length:</span> {formData.wordLimit.toLocaleString()} words
              </div>
              {formData.customSections.length > 0 && (
                <div>
                  <span className="font-medium">Custom Sections:</span>
                  <ul className="list-disc list-inside mt-1">
                    {formData.customSections.map((section, index) => (
                      <li key={index} className="text-sm">{section}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep > step.id
                  ? 'bg-green-500 text-white'
                  : currentStep === step.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 w-16 mx-2 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <h2 className="text-xl font-semibold">{steps[currentStep - 1].title}</h2>
          <p className="text-gray-600">{steps[currentStep - 1].description}</p>
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 mb-8">
        {renderStepContent()}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          {currentStep < steps.length ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Report'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
