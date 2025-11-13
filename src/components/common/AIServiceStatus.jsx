import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { functionsService } from '@/services/functions';

/**
 * AI Service Status Indicator - Compact version for sidebar
 * Shows the current status of the AI Trip generation service
 */
export const AIServiceStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Check status every 2 minutes
    const interval = setInterval(checkStatus, 120000);
    
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      setRefreshing(true);
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
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || !status) {
    return null; // Don't show anything while loading
  }

  // Get status styling - using calmer blue colors
  const getStatusConfig = () => {
    switch (status.status) {
      case 'available':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: CheckCircle,
          iconColor: 'text-blue-500',
          dotColor: 'bg-blue-500',
          label: 'Available'
        };
      case 'quota_exceeded':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-800',
          icon: Clock,
          iconColor: 'text-blue-600',
          dotColor: 'bg-blue-400',
          label: 'Try again in few minutes'
        };
      case 'unavailable':
      case 'error':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-800',
          icon: AlertCircle,
          iconColor: 'text-blue-600',
          dotColor: 'bg-blue-400',
          label: 'Try again in few minutes'
        };
      default:
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: AlertCircle,
          iconColor: 'text-blue-500',
          dotColor: 'bg-blue-400',
          label: 'Checking...'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3 mb-3`}>
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
          <div className="flex flex-col">
            <span className={`text-xs font-medium ${config.textColor}`}>
              AI Trip Generation
            </span>
            <span className={`text-xs ${config.textColor} opacity-80`}>
              {config.label}
            </span>
          </div>
        </div>
        <button
          className={`p-1 ${config.textColor} hover:bg-blue-100 rounded transition-colors ${refreshing ? 'animate-spin' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            checkStatus();
          }}
          disabled={refreshing}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
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
                    key.status === 'working' ? 'bg-blue-500' : 
                    key.status === 'quota_exceeded' ? 'bg-blue-400' : 
                    'bg-blue-300'
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
