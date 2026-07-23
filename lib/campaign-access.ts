type CampaignViewer = {
  id: string;
  role: string;
};

export function canAccessCampaign(managerId: string | null, viewer: CampaignViewer) {
  if (viewer.role === "ADMIN") return true;
  if (viewer.role !== "MANAGER") return false;
  return managerId === null || managerId === viewer.id;
}
