/**
 * @module @kb-labs/core-platform/workspace/workspace-provider
 * Workspace lifecycle abstraction.
 *
 * This port manages workspace materialization and attach/release lifecycle.
 */

export type WorkspaceStatus =
  | "pending"
  | "materializing"
  | "ready"
  | "attaching"
  | "attached"
  | "releasing"
  | "released"
  | "failed";

export interface WorkspaceMount {
  hostPath?: string;
  mountPath?: string;
  readOnly?: boolean;
}

export interface MaterializeWorkspaceRequest {
  workspaceId?: string;
  tenantId?: string;
  namespace?: string;
  sourceRef?: string;
  basePath?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceDescriptor {
  workspaceId: string;
  provider: string;
  status: WorkspaceStatus;
  rootPath?: string;
  mount?: WorkspaceMount;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AttachWorkspaceRequest {
  workspaceId: string;
  environmentId: string;
  mountPath?: string;
  readOnly?: boolean;
}

export interface WorkspaceAttachment {
  workspaceId: string;
  environmentId: string;
  mountPath?: string;
  attachedAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceStatusResult {
  workspaceId: string;
  status: WorkspaceStatus;
  reason?: string;
  updatedAt: string;
}

export interface WorkspaceProviderCapabilities {
  supportsAttach?: boolean;
  supportsRelease?: boolean;
  supportsReadOnlyMounts?: boolean;
  custom?: Record<string, unknown>;
}

export interface IWorkspaceProvider {
  materialize(request: MaterializeWorkspaceRequest): Promise<WorkspaceDescriptor>;
  attach(request: AttachWorkspaceRequest): Promise<WorkspaceAttachment>;
  release(workspaceId: string, environmentId?: string): Promise<void>;
  getStatus(workspaceId: string): Promise<WorkspaceStatusResult>;
  getCapabilities?(): WorkspaceProviderCapabilities;
}
