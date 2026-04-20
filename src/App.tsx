import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, Plus, Terminal, Save, Trash2, AlertTriangle, X } from "lucide-react";
import { HostData } from "./types";

// --- Confirm Dialog Component ---
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-slate-200 text-sm">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [hosts, setHosts] = useState<HostData[]>([]);
  const [filteredHosts, setFilteredHosts] = useState<HostData[]>([]);
  const [selectedHost, setSelectedHost] = useState<HostData | null>(null);
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<HostData>({ original_host: "", host: "", params: {} });
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  const loadHosts = async () => {
    try {
      const result: HostData[] = await invoke("get_ssh_config");
      result.sort((a, b) => a.host.localeCompare(b.host));
      setHosts(result);
      setFilteredHosts(result);
    } catch (e) {
      console.error("Failed to load generic SSH config", e);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFilteredHosts(hosts.filter(h => h.host.toLowerCase().includes(term)));
  }, [search, hosts]);

  const selectHost = (h: HostData) => {
    setSelectedHost(h);
    setFormData({ ...h, params: { ...h.params } });
    setIsEditing(false);
  };

  const handleAddNew = () => {
    const newHost: HostData = { original_host: "", host: "new-host", params: {} };
    setSelectedHost(null);
    setFormData(newHost);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!formData.host.trim()) {
      alert("Host name is required.");
      return;
    }
    const dataToSave = { ...formData };
    try {
      await invoke("save_ssh_host", { data: dataToSave });
      await loadHosts();
      setSelectedHost(dataToSave);
      setFormData({ ...dataToSave, original_host: dataToSave.host });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return;
    setConfirmTarget(null);
    try {
      await invoke("delete_ssh_host", { originalHost: confirmTarget });
      await loadHosts();
      setSelectedHost(null);
      setFormData({ original_host: "", host: "", params: {} });
    } catch (e) {
      console.error("Delete Error:", e);
    }
  };

  const updateParam = (key: string, value: string) => {
    setFormData({
      ...formData,
      params: { ...formData.params, [key]: value },
    });
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Confirm Delete Dialog */}
      {confirmTarget && (
        <ConfirmDialog
          message={`Are you sure you want to delete host "${confirmTarget}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Sidebar */}
      <div className="w-80 flex flex-col border-r border-slate-800 bg-slate-950">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-100 flex items-center">
            <Terminal className="w-5 h-5 mr-2 text-blue-500" />
            SSH Config Editor
          </h1>
          <button onClick={handleAddNew} className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors" title="New Host">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 border-b border-slate-800 relative">
          <Search className="w-4 h-4 absolute left-6 top-6 text-slate-500" />
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 text-sm rounded-md py-2 pl-9 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search hosts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredHosts.map(h => (
            <div
              key={h.host}
              onClick={() => selectHost(h)}
              className={`px-3 py-2 text-sm rounded-md cursor-pointer transition-colors ${
                (selectedHost?.host === h.host || (!selectedHost && formData.original_host === h.host && !isEditing))
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {h.host}
            </div>
          ))}
          {filteredHosts.length === 0 && (
            <div className="text-center text-slate-500 text-sm mt-4">No hosts found.</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {(!selectedHost && !isEditing && formData.original_host === "") ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a host or create a new one to get started.
          </div>
        ) : (
          <div className="p-8 max-w-2xl w-full mx-auto overflow-y-auto">
            <div className="flex flex-row justify-between items-end mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {formData.original_host ? `Edit Host: ${formData.original_host}` : "New Host Entry"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">Configure SSH parameters for this connection.</p>
              </div>
              <div className="flex space-x-2">
                {formData.original_host && (
                  <button
                    onClick={() => setConfirmTarget(formData.original_host)}
                    className="flex items-center px-3 py-2 text-sm rounded-md border border-red-900 text-red-400 hover:bg-red-950 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </button>
                )}
                <button
                  onClick={handleSave}
                  className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Host Alias</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. github.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">HostName</label>
                <input
                  type="text"
                  value={formData.params["HostName"] || formData.params["Hostname"] || formData.params["hostname"] || ""}
                  onChange={(e) => updateParam("HostName", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 192.168.1.100 or ssh.github.com"
                />
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-400 mb-1">User</label>
                  <input
                    type="text"
                    value={formData.params["User"] || formData.params["user"] || ""}
                    onChange={(e) => updateParam("User", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. root"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Port</label>
                  <input
                    type="text"
                    value={formData.params["Port"] || formData.params["port"] || ""}
                    onChange={(e) => updateParam("Port", e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="22"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">IdentityFile</label>
                <input
                  type="text"
                  value={formData.params["IdentityFile"] || formData.params["identityfile"] || ""}
                  onChange={(e) => updateParam("IdentityFile", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. ~/.ssh/id_rsa"
                />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
