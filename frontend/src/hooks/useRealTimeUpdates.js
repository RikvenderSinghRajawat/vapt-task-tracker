import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';

/**
 * Hook to listen for real-time project allocation updates
 * @returns {Object} Object containing update functions and listener control
 */
export const useProjectAllocations = () => {
  const { user } = useAuth();
  const [allocatedProjects, setAllocatedProjects] = useState(user?.allocatedProjects || []);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Sync with initial auth state
    setAllocatedProjects(user.allocatedProjects || []);

    const handleAllocationUpdate = (data) => {
      
      
      const currentUserId = user.uid || user.id || user._id;
      if (String(data.userId) === String(currentUserId)) {
        if (data.action === 'assigned' && data.projectId) {
          setAllocatedProjects(prev => [...new Set([...prev, data.projectId])]);
        } else if (data.action === 'unassigned' && data.projectId) {
          setAllocatedProjects(prev => prev.filter(id => id !== data.projectId));
        }
      }
      setLastUpdate(new Date());
    };

    const unsubscribe = socketService.on('project_allocated', handleAllocationUpdate);
    
    // Join private room for targeted updates
    socketService.joinUserRoom(user.uid || user.id || user._id);

    return () => {
      unsubscribe();
    };
  }, [user, user?.allocatedProjects]);

  return { allocatedProjects, lastUpdate };
};

/**
 * Hook to listen for real-time finding assignment updates
 * @returns {Object} Object containing update functions and listener control
 */
export const useFindingAssignments = () => {
  const { user } = useAuth();
  const [assignedFindings, setAssignedFindings] = useState([]);

  useEffect(() => {
    if (!user) return;

    const handleFindingUpdate = (data) => {
      
      
      // If the update is relevant to the current user, update local state
      const isRelevant = 
        data.userId === user.uid || 
        (data.assignedTo && data.assignedTo.includes(user.uid)) ||
        (data.projectId && /* check if user has access to this project */ true); // Simplified
        
      if (isRelevant) {
        // In a real implementation, this would trigger a refetch of findings
        // For now, we'll just note that an update occurred
        // A more sophisticated approach would cache findings and update them
      }
    };

    const unsubscribe = socketService.on('finding_updated', handleFindingUpdate);
    
    // Join user room for finding updates
    socketService.joinUserRoom(user.uid);

    return () => {
      unsubscribe();
      // Note: We don't leave the room here as other components might need it
    };
  }, [user]);

  return { assignedFindings, setAssignedFindings };
};

/**
 * Hook to listen for real-time project data updates (for PMs and admins)
 * @returns {Object} Object containing update functions and listener control
 */
export const useProjectUpdates = () => {
  const { user } = useAuth();
  const [projectData, setProjectData] = useState({});

  useEffect(() => {
    if (!user) return;

    const handleProjectUpdate = (data) => {
      
      // Would trigger refetch of project data
    };

    const unsubscribe = socketService.on('project_updated', handleProjectUpdate);
    
    // If user is PM or admin, they might want to listen to project updates
    if (user.role === 'project_manager' || user.role === 'admin' || user.role === 'vapt_analyst') {
      // Join specific project rooms based on user's allocations/responsibilities
      // This would be more sophisticated in a real implementation
    }

    return () => {
      unsubscribe();
    };
  }, [user]);

  return { projectData, setProjectData };
};

export { useProjectAllocations, useFindingAssignments, useProjectUpdates };