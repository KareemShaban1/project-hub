import { prisma } from '../services/db.js';
import { ensureTenantAccess } from '../middleware/tenant.js';

export enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

/**
 * Check if user has access to a project
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string,
  tenantId: string
): Promise<{ hasAccess: boolean; role?: ProjectRole }> {
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      tenantId
    }
  });

  if (!membership) {
    // Check if user is the creator
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return { hasAccess: false };
    }

    ensureTenantAccess(tenantId, project.tenantId);

    if (project.createdBy === userId) {
      return { hasAccess: true, role: ProjectRole.OWNER };
    }

    return { hasAccess: false };
  }

  return { hasAccess: true, role: membership.role as ProjectRole };
}

/**
 * Check if user can perform write operations
 */
export function canWrite(role?: ProjectRole): boolean {
  return role === ProjectRole.OWNER || 
         role === ProjectRole.ADMIN || 
         role === ProjectRole.MEMBER;
}

/**
 * Check if user can perform admin operations
 */
export function canAdmin(role?: ProjectRole): boolean {
  return role === ProjectRole.OWNER || role === ProjectRole.ADMIN;
}



