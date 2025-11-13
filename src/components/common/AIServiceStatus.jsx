import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { functionsService } from '@/services/functions';

/**
 * AI Service Status Indicator
 * Shows the current status of the AI Trip generation service
 */
export const AIServiceStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Check status every 2 minutes
    const interval = setInterval(checkStatus, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await functionsService.invoke('checkAIServiceStatus', {});
      setStatus(response);
      setLoading(false);
    } catch (error) {
      console.error('Failed to check AI service status:', error);
      setStatus({
        status: 'error',
        message: 'Unable to check service status'
      });
      setLoading(false);
    }
  };

  if (loading || !status) {
    return null; // Don't show anything while loading
  }

  // Get status styling
  const getStatusConfig = () => {
    switch (status.status) {
      case 'available':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          icon: CheckCircle,
          iconColor: 'text-green-500',
          dotColor: 'bg-green-500'
        };
      case 'quota_exceeded':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          icon: Clock,
          iconColor: 'text-yellow-500',
          dotColor: 'bg-yellow-500'
        };
      case 'unavailable':
      case 'error':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          icon: XCircle,
          iconColor: 'text-red-500',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          icon: AlertCircle,
          iconColor: 'text-gray-500',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 mb-4`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <span className={`flex h-2 w-2 ${config.dotColor} rounded-full`}>
              {status.status === 'available' && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`}></span>
              )}
            </span>
          </div>
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
          <span className={`text-sm font-medium ${config.textColor}`}>
            AI Trip Generation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${config.textColor}`}>
            {status.status === 'available' ? 'Available' : 
             status.status === 'quota_exceeded' ? 'Quota Exceeded' : 
             'Unavailable'}
          </span>
          <button
            className={`text-xs ${config.textColor} hover:underline`}
            onClick={(e) => {
              e.stopPropagation();
              checkStatus();
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`mt-3 pt-3 border-t ${config.borderColor}`}>
          <p className={`text-xs ${config.textColor} mb-2`}>
            {status.message}
          </p>
          
          {status.availableKeys && (
            <div className="text-xs space-y-1">
              <p className={config.textColor}>
                <strong>Available Keys:</strong> {status.availableKeys}
              </p>
              <p className={config.textColor}>
                <strong>Working Keys:</strong> {status.workingKeys}
              </p>
            </div>
          )}

          {status.keys && status.keys.length > 0 && (
            <div className="mt-2 space-y-1">
              {status.keys.map((key, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    key.status === 'working' ? 'bg-green-500' : 
                    key.status === 'quota_exceeded' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></span>
                  <span className={config.textColor}>
                    {key.key}: {key.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {status.timestamp && (
            <p className={`text-xs ${config.textColor} opacity-70 mt-2`}>
              Last checked: {new Date(status.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
