import { supabase } from "./client";

export async function uploadPolicyFile(policyId: string, file: File) {
  const base64 = await file.arrayBuffer().then((buf) => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  });
  const { data, error } = await supabase.functions.invoke("upload-policy-file", {
    body: {
      policy_id: policyId,
      file_name: file.name,
      content_type: file.type || "application/octet-stream",
      base64,
    },
  });
  if (error) throw error;
  return data as { ok: boolean; storage_path: string; signed_url?: string };
}

export async function signPolicyFile(storage_path: string) {
  const { data, error } = await supabase.functions.invoke("sign-policy-file", {
    body: { storage_path },
  });
  if (error) throw error;
  return data as { signed_url: string | null };
}

export async function deletePolicyFile(policyId: string, storage_path: string) {
  const { data, error } = await supabase.functions.invoke("delete-policy-file", {
    body: { policy_id: policyId, storage_path },
  });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function uploadControlEvidence(controlId: string, file: File, opts?: { version?: string | null; expires_at?: string | null }) {
  const base64 = await file.arrayBuffer().then((buf) => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  });
  const { data, error } = await supabase.functions.invoke("upload-control-evidence", {
    body: {
      control_id: controlId,
      file_name: file.name,
      content_type: file.type || "application/octet-stream",
      base64,
      version: opts?.version || null,
      expires_at: opts?.expires_at || null,
    },
  });
  if (error) throw error;
  return data as { ok: boolean; storage_path: string; signed_url?: string };
}

export async function signEvidenceFile(storage_path: string) {
  const { data, error } = await supabase.functions.invoke("sign-evidence-file", {
    body: { storage_path },
  });
  if (error) throw error;
  return data as { signed_url: string | null };
}

export async function deleteEvidenceFile(controlId: string, storage_path: string) {
  const { data, error } = await supabase.functions.invoke("delete-evidence-file", {
    body: { control_id: controlId, storage_path },
  });
  if (error) throw error;
  return data as { ok: boolean };
}