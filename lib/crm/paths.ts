export function prospectDetailHref(prospectId: string, listReturnUrl: string): string {
  const projectMatch = listReturnUrl.match(/^\/projects\/([^/?#]+)/);
  const back = encodeURIComponent(listReturnUrl);
  if (projectMatch) {
    return `/projects/${projectMatch[1]}/prospects/${prospectId}?back=${back}`;
  }
  return `/crm/prospects/${prospectId}?back=${back}`;
}
