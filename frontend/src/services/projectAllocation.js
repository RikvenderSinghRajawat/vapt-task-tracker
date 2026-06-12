/**
 * Project Allocation Service - Handles PM allocation of developers to projects
 * Ensures PMs can only assign developers to projects they are allocated to
 */

import { userAPI, projectAPI } from './restService';
import socketService from './socketService';

/**
 * Get all developer users (for PM to see available developers)
 * @returns {Promise<Array>} Array of developer users
 */
export const getAvailableDevelopers = async () => {
  try {
    const users = await userAPI.getUsers();
    return users.filter(u => u.role === 'developer' && u.isActive !== false);
  } catch (error) {
    console.error('Error fetching developers:', error);
    throw error;
  }
};

/**
 * Get developers allocated to a specific project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of developer users
 */
export const getDevelopersForProject = async (projectId) => {
  try {
    const users = await userAPI.getUsers();
    return users.filter(u => 
      u.role === 'developer' && 
      u.allocatedProjects?.includes(projectId)
    );
  } catch (error) {
    console.error('Error fetching project developers:', error);
    throw error;
  }
};

/**
 * Check if PM can manage a specific project
 * @param {Object} pmUser - PM user object
 * @param {string} projectId - Project ID to check
 * @returns {boolean}
 */
export const canPMAllocateToProject = (pmUser, projectId) => {
  if (!pmUser || pmUser.role !== 'project_manager') return false;
  const allocatedProjects = pmUser.allocatedProjects || [];
  return allocatedProjects.includes(projectId);
};

/**
 * PM assigns developer to project
 * PM can only assign to projects they are allocated to
 * @param {Object} pmUser - PM user object
 * @param {string} developerId - Developer user ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Result with success status
 */
export const assignDeveloperToProject = async (pmUser, developerId, projectId) => {
  try {
    // Verify PM has access to this project
    if (!canPMAllocateToProject(pmUser, projectId)) {
      throw new Error('You are not allocated to this project and cannot assign developers to it');
    }

    // Get current developer data
    const developer = await userAPI.getUser(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    if (developer.role !== 'developer') {
      throw new Error('Can only assign developers to projects');
    }

    // Check if already allocated
    const currentProjects = developer.allocatedProjects || [];
    if (currentProjects.includes(projectId)) {
      throw new Error('Developer is already allocated to this project');
    }

    // Add project to developer's allocated projects
    const updatedProjects = [...currentProjects, projectId];
    
    await userAPI.updateUser(developerId, {
      ...developer,
      allocatedProjects: updatedProjects,
      updatedAt: new Date().toISOString(),
      updatedBy: pmUser.uid,
      updatedByRole: 'project_manager'
    });

    // Emit real-time update for project allocation
    if (socketService.isConnected()) {
      socketService.emit('project_allocated', {
        userId: developerId,
        projectId,
        allocatedBy: pmUser.uid,
        action: 'assigned'
      });
      
      // Join the developer to the project room for real-time updates
      socketService.joinProjectRoom(projectId);
      socketService.joinUserRoom(developerId);
    }

    return {
      success: true,
      message: `Developer assigned to project successfully`,
      developerId,
      projectId
    };

  } catch (error) {
    console.error('Error assigning developer:', error);
    throw error;
  }
};

/**
 * PM removes developer from project
 * PM can only remove from projects they are allocated to
 * @param {Object} pmUser - PM user object
 * @param {string} developerId - Developer user ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Result with success status
 */
export const removeDeveloperFromProject = async (pmUser, developerId, projectId) => {
  try {
    // Verify PM has access to this project
    if (!canPMAllocateToProject(pmUser, projectId)) {
      throw new Error('You are not allocated to this project and cannot remove developers from it');
    }

    // Get current developer data
    const developer = await userAPI.getUser(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    // Check if allocated
    const currentProjects = developer.allocatedProjects || [];
    if (!currentProjects.includes(projectId)) {
      throw new Error('Developer is not allocated to this project');
    }

    // Remove project from developer's allocated projects
    const updatedProjects = currentProjects.filter(pid => pid !== projectId);
    
    await userAPI.updateUser(developerId, {
      ...developer,
      allocatedProjects: updatedProjects,
      updatedAt: new Date().toISOString(),
      updatedBy: pmUser.uid,
      updatedByRole: 'project_manager'
    });

    // Emit real-time update for project deallocation
    if (socketService.isConnected()) {
      socketService.emit('project_allocated', {
        userId: developerId,
        projectId,
        allocatedBy: pmUser.uid,
        action: 'unassigned'
      });
      
      // Leave the developer from the project room
      socketService.leaveProjectRoom(projectId);
    }

    return {
      success: true,
      message: `Developer removed from project successfully`,
      developerId,
      projectId
    };

  } catch (error) {
    console.error('Error removing developer:', error);
    throw error;
  }
};

/**
 * PM batch assigns developer to multiple projects
 * All projects must be in PM's allocated list
 * @param {Object} pmUser - PM user object
 * @param {string} developerId - Developer user ID
 * @param {Array<string>} projectIds - Array of project IDs
 * @returns {Promise<Object>} Result with success/failure details
 */
export const batchAssignDeveloper = async (pmUser, developerId, projectIds) => {
  try {
    const pmProjects = pmUser.allocatedProjects || [];
    
    // Filter to only projects PM can allocate to
    const allowedProjects = projectIds.filter(pid => pmProjects.includes(pid));
    const rejectedProjects = projectIds.filter(pid => !pmProjects.includes(pid));

    if (allowedProjects.length === 0) {
      throw new Error('You are not allocated to any of the selected projects');
    }

    // Get current developer data
    const developer = await userAPI.getUser(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    // Merge projects (avoid duplicates)
    const currentProjects = developer.allocatedProjects || [];
    const newProjects = allowedProjects.filter(pid => !currentProjects.includes(pid));
    const updatedProjects = [...currentProjects, ...newProjects];

    await userAPI.updateUser(developerId, {
      ...developer,
      allocatedProjects: updatedProjects,
      updatedAt: new Date().toISOString(),
      updatedBy: pmUser.uid,
      updatedByRole: 'project_manager'
    });

    // Emit real-time update for batch project allocation
    if (socketService.isConnected()) {
      socketService.emit('batch_project_allocated', {
        userId: developerId,
        projectIds: allowedProjects,
        allocatedBy: pmUser.uid,
        action: 'assigned'
      });
      
      // Join the developer to all allocated project rooms
      allowedProjects.forEach(projectId => {
        socketService.joinProjectRoom(projectId);
      });
      socketService.joinUserRoom(developerId);
    }

    return {
      success: true,
      assigned: newProjects.length,
      rejected: rejectedProjects.length,
      rejectedProjects,
      message: `Assigned to ${newProjects.length} project(s)`
    };

  } catch (error) {
    console.error('Error batch assigning developer:', error);
    throw error;
  }
};

/**
 * Get PM's project assignment summary
 * Shows which developers are assigned to which of PM's projects
 * @param {Object} pmUser - PM user object
 * @returns {Promise<Object>} Summary data
 */
export const getPMAssignmentSummary = async (pmUser) => {
  try {
    const pmProjects = pmUser.allocatedProjects || [];
    
    if (pmProjects.length === 0) {
      return { projects: [], unassignedDevelopers: [] };
    }
    
    // Get all projects
    const allProjects = await projectAPI.getProjects();
    const pmProjectData = allProjects.filter(p => pmProjects.includes(p.id));
    
    // Get all developers
    const developers = await getAvailableDevelopers();
    
    // Build assignment map
    const projectAssignments = pmProjectData.map(project => {
      const assignedDevs = developers.filter(d => 
        d.allocatedProjects?.includes(project.id)
      );
      
      return {
        project,
        assignedDevelopers: assignedDevs,
        count: assignedDevs.length
      };
    });
    
    // Find unassigned developers (not assigned to any of PM's projects)
    const unassignedDevs = developers.filter(d => {
      const devProjects = d.allocatedProjects || [];
      return !pmProjects.some(pid => devProjects.includes(pid));
    });
    
    return {
      projects: projectAssignments,
      unassignedDevelopers: unassignedDevs,
      totalProjects: pmProjects.length,
      totalDevelopers: developers.length,
      assignedCount: developers.length - unassignedDevs.length
    };
    
  } catch (error) {
    console.error('Error getting assignment summary:', error);
    throw error;
  }
};

/**
 * Check if developer can be assigned to project by PM
 * @param {Object} pmUser - PM user object
 * @param {string} developerId - Developer ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Check result
 */
export const checkAssignmentEligibility = async (pmUser, developerId, projectId) => {
  try {
    // Check PM allocation
    if (!canPMAllocateToProject(pmUser, projectId)) {
      return {
        eligible: false,
        reason: 'PM_NOT_ALLOCATED',
        message: 'You are not allocated to this project'
      };
    }
    
    // Get developer
    const developer = await userAPI.getUser(developerId);
    if (!developer) {
      return {
        eligible: false,
        reason: 'DEVELOPER_NOT_FOUND',
        message: 'Developer not found'
      };
    }
    
    if (developer.role !== 'developer') {
      return {
        eligible: false,
        reason: 'NOT_DEVELOPER',
        message: 'User is not a developer'
      };
    }
    
    // Check if already allocated
    const currentProjects = developer.allocatedProjects || [];
    if (currentProjects.includes(projectId)) {
      return {
        eligible: false,
        reason: 'ALREADY_ALLOCATED',
        message: 'Developer is already allocated to this project'
      };
    }
    
    return {
      eligible: true,
      developer,
      projectId
    };
    
  } catch (error) {
    return {
      eligible: false,
      reason: 'ERROR',
      message: error.message
    };
  }
};

export default {
  getAvailableDevelopers,
  getDevelopersForProject,
  canPMAllocateToProject,
  assignDeveloperToProject,
  removeDeveloperFromProject,
  batchAssignDeveloper,
  getPMAssignmentSummary,
  checkAssignmentEligibility
};
