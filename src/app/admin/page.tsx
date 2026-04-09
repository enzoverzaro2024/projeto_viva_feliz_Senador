"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, LogOut, Loader2, Trash2, Download, Search, Plus, QrCode, Pencil, Check, X, Users, Shield, Key, UserPlus, CreditCard, Printer, Calendar, Save, Eye, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import Papa from "papaparse";

interface ParticipantData {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  age: string | null;
  address: string | null;
  neighborhood: string | null;
  cardId: string;
  cardNumber: string | null;
  currentBalance: string;
  processedResgate: number;
  processedReforco: number;
  createdAt: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

type TabType = "aprovacoes" | "participantes" | "pontos" | "ranking" | "usuarios" | "cartoes" | "gestao_noite" | "resgate" | "reforco" | "presenca";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("ranking");
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
  const [unassignedCards, setUnassignedCards] = useState<ParticipantData[]>([]);

  // ---- MANUAL CREATE PARTICIPANT ----
  const [createParticipantModal, setCreateParticipantModal] = useState(false);
  const [newParticipantData, setNewParticipantData] = useState({ name: '', email: '', phone: '', age: '', address: '', neighborhood: '', cardNumber: '' });
  const [createParticipantLoading, setCreateParticipantLoading] = useState(false);

  const handleCreateParticipant = async (e?: React.FormEvent, overwrite: boolean = false) => {
    if (e) e.preventDefault();
    setCreateParticipantLoading(true);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newParticipantData, overwrite }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Participante cadastrado com sucesso!");
        setCreateParticipantModal(false);
        setNewParticipantData({ name: '', email: '', phone: '', age: '', address: '', neighborhood: '', cardNumber: '' });
        fetchParticipants();
      } else {
        if (data.error === "duplicated") {
          const confirmUpdate = confirm(
            `${data.message}\n\nDeseja realmente SUBSCREVER os novos dados sobre esse cadastro?\n\n(Atenção: O saldo atual do cartão será mantido intacto!)`
          );
          if (confirmUpdate) {
            // Chama a função novamente com a flag overwrite
            return handleCreateParticipant(undefined, true);
          }
        } else {
          toast.error(data.error || "Erro ao cadastrar");
        }
      }
    } catch {
      toast.error("Erro interno ao cadastrar");
    } finally {
      setCreateParticipantLoading(false);
    }
  };

  // User edit state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserData, setEditUserData] = useState({ name: "", email: "", password: "" });
  const [editUserLoading, setEditUserLoading] = useState(false);

  // Create user state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });
  const [createUserLoading, setCreateUserLoading] = useState(false);

  // Password change state
  const [changingPasswordId, setChangingPasswordId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", email: "", phone: "", balance: "", cardNumber: "", age: "", address: "", neighborhood: "", attendanceCount: 0 });
  const [editLoading, setEditLoading] = useState(false);
  const [showExtraCols, setShowExtraCols] = useState(false);

  // Sort & filter state for participants table
  type SortKey = "name" | "cardNumber" | "currentBalance" | "age" | "address" | "neighborhood" | "email" | "phone";
  type SortDir = "asc" | "desc" | null;
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [colFilters, setColFilters] = useState({ name: "", email: "", phone: "", cardNumber: "", currentBalance: "", age: "", address: "", neighborhood: "" });

  // Points form
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [pointAmount, setPointAmount] = useState("50");
  const [pointDescription, setPointDescription] = useState("");
  const [pointLoading, setPointLoading] = useState(false);

  // QR hidden ref for download
  const qrDownloadRef = useRef<HTMLDivElement>(null);
  const [downloadCardId, setDownloadCardId] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const [downloadCardNumber, setDownloadCardNumber] = useState("");

  // Card template (JPG art)
  const [cardTemplate, setCardTemplate] = useState<string | null>(null);
  const [templateQrX, setTemplateQrX] = useState(330);
  const [templateQrY, setTemplateQrY] = useState(80);
  const [templateQrSize, setTemplateQrSize] = useState(180);

  // Event Management Info
  const [eventInfo, setEventInfo] = useState({
    projectName: "Viva Feliz",
    location: "Rua Exemplo, 123 - Bairro",
    prevSummary: "",
    prizesList: "- Uma cama box casal\n- Um Fogão\n- Panela de pressão\n- e muito mais.",
    nextChallenge: "DESAFIO VENCIDO - 300 pontos\nPARTICIPAR DO DESAFIO - 50 pontos",
    tonightPoints: "Sua presença - 50 pontos\nTrazer uma amigo que nunca veio antes - 50 pontos (por amigo)\nCada pergunta respondida - 100 pontos",
    attPoints: "50",
    customMessage: "",
  });
  const [eventInfoLoading, setEventInfoLoading] = useState(false);
  const [absentees, setAbsentees] = useState<ParticipantData[]>([]);
  const [absenteesLoading, setAbsenteesLoading] = useState(false);
  const [attendees, setAttendees] = useState<ParticipantData[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [attendanceModalUser, setAttendanceModalUser] = useState<ParticipantData | null>(null);
  const [newAttendanceDate, setNewAttendanceDate] = useState<string>("");
  const [presenceSearch, setPresenceSearch] = useState("");
  const [resgateEditId, setResgateEditId] = useState<number | null>(null);
  const [resgateEditData, setResgateEditData] = useState<{ name: string; phone: string }>({ name: '', phone: '' });
  const [resgateShowDone, setResgateShowDone] = useState<"pending" | "done" | "invalid">("pending");
  const [reforcoShowDone, setReforcoShowDone] = useState<"pending" | "done" | "invalid">("pending");

  // States for Card Transfer
  const [transferParticipant, setTransferParticipant] = useState<ParticipantData | null>(null);
  const [newCardIdForTransfer, setNewCardIdForTransfer] = useState("");
  const [newCardNumberForTransfer, setNewCardNumberForTransfer] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchParticipants = async (q?: string, silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const url = q ? `/api/admin/participants?search=${encodeURIComponent(q)}` : "/api/admin/participants";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setParticipants(data.participants || []);
    } catch {
      if (!silent) toast.error("Erro ao carregar participantes");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) {
        const users = data.users || [];
        setAllUsers(users);
        setPendingUsers(users.filter((u: UserData) => u.role === "user"));
      }
    } catch { }
  };

  const fetchUnassignedCards = async () => {
    try {
      const res = await fetch("/api/admin/batch-cards");
      const data = await res.json();
      if (res.ok) setUnassignedCards(data.cards || []);
    } catch { }
  };

  const fetchEventInfo = async () => {
    try {
      const res = await fetch("/api/admin/settings/event");
      const data = await res.json();
      if (res.ok && data.eventInfo) {
        setEventInfo({
          projectName: data.eventInfo.projectName || "Viva Feliz",
          location: data.eventInfo.location || "",
          prevSummary: data.eventInfo.prevSummary || "",
          prizesList: data.eventInfo.prizesList || "",
          nextChallenge: data.eventInfo.nextChallenge || "",
          tonightPoints: data.eventInfo.tonightPoints || "",
          attPoints: data.eventInfo.attPoints?.toString() || "50",
          customMessage: data.eventInfo.customMessage || "",
        });
      }
    } catch { }
  };

  const fetchAbsentees = async () => {
    setAbsenteesLoading(true);
    try {
      const res = await fetch("/api/admin/absentees");
      const data = await res.json();
      if (res.ok) setAbsentees(data.absentees || []);
    } catch { } finally { setAbsenteesLoading(false); }
  };

  const fetchAttendees = async () => {
    setAttendeesLoading(true);
    try {
      const res = await fetch("/api/admin/attendees");
      const data = await res.json();
      if (res.ok) setAttendees(data.attendees || []);
    } catch { } finally { setAttendeesLoading(false); }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await fetch("/api/admin/attendance");
      const data = await res.json();
      if (res.ok) setAllAttendance(data.attendance || []);
    } catch { }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/");
      return;
    }
    fetchParticipants();
    fetchAllUsers();
    fetchUnassignedCards();
    fetchEventInfo();
    fetchAbsentees();
    fetchAttendees();
    fetchAllAttendance();
  }, [user]);

  const [designLoading, setDesignLoading] = useState(false);
  const saveCardDesign = async () => {
    setDesignLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardTemplateImage: cardTemplate,
          templateQrX,
          templateQrY,
          templateQrSize
        })
      });
      if (res.ok) toast.success("Design do cartão salvo!");
      else toast.error("Erro ao salvar design");
    } catch { toast.error("Erro de conexão"); }
    finally { setDesignLoading(false); }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        
        const s = data.settings || {};
        
        // Prioriza o que vem do Banco de Dados agora que a persistência está funcionando
        if (s.cardTemplateImage) setCardTemplate(s.cardTemplateImage);
        else setCardTemplate(localStorage.getItem("cardTemplateImage"));

        setTemplateQrX(s.templateQrX || Number(localStorage.getItem("cardTemplateQrX")) || 330);
        setTemplateQrY(s.templateQrY || Number(localStorage.getItem("cardTemplateQrY")) || 80);
        setTemplateQrSize(s.templateQrSize || Number(localStorage.getItem("cardTemplateQrSize")) || 180);

      } catch (err) {
        console.error("Error loading settings from server:", err);
      }
    };
    fetchSettings();
  }, [user]);

  const handleTransferCard = async () => {
    if (!transferParticipant || !newCardIdForTransfer) {
      toast.error("Informe o novo ID do cartão");
      return;
    }
    setTransferLoading(true);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: transferParticipant.id,
          newCardId: newCardIdForTransfer.trim(),
          newCardNumber: newCardNumberForTransfer.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Cartão substituído com sucesso!");
        setTransferParticipant(null);
        setNewCardIdForTransfer("");
        setNewCardNumberForTransfer("");
        fetchParticipants(search);
      } else {
        toast.error(data.error || "Erro ao trocar cartão");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setTransferLoading(false);
    }
  };

  // Template centralizado para garantir consistência
  const defaultWhatsAppTemplate = (info: any) => `Somos do Projeto *${info.projectName}*! ✨

🌟 Ontem: ${info.prevSummary || 'Programação foi excelente!'}

* 🎯 Hoje: É o dia mais importante do projeto ${info.projectName}!*

🎯 *O desafio de hoje é:*
🏆 Desafio: ${info.nextChallenge || '...'}

Lembre-se que você pode ganhar prêmios incríveis! 🎁
*Prêmios como:*
${info.prizesList || '...'}

🏆 *Pontos hoje:*
${info.tonightPoints || '...'}

📍 *Local:* ${info.location || '...'}

Te esperamos lá! 🔥`;

  const lastAutoMsgRef = useRef("");
  const prevEventInfoRef = useRef(eventInfo);

  // Sincronização em tempo real da mensagem do WhatsApp
  useEffect(() => {
    if (activeTab !== "gestao_noite") return;

    // Função para ignorar diferenças de quebra de linha (\r\n vs \n) e espaços nas pontas
    const normalize = (s: string) => (s || "").replace(/\r\n/g, "\n").trim();

    const newMsg = defaultWhatsAppTemplate(eventInfo);
    const oldMsg = defaultWhatsAppTemplate(prevEventInfoRef.current);
    const currentMsg = eventInfo.customMessage || "";

    const lastAutoLocal = localStorage.getItem("lastAutoMsg") || "";
    
    // Consideramos "automático" se:
    // 1. Estiver vazio
    // 2. Coincidir com o que o template geraria com os dados anteriores (oldMsg)
    // 3. Coincidir com o que geramos nesta sessão (lastAutoMsgRef)
    // 4. Coincidir com o que foi salvo no localStorage anteriormente
    const isAuto = !currentMsg.trim() || 
                   normalize(currentMsg) === normalize(oldMsg) || 
                   normalize(currentMsg) === normalize(lastAutoMsgRef.current) || 
                   normalize(currentMsg) === normalize(lastAutoLocal);

    if (isAuto && normalize(currentMsg) !== normalize(newMsg)) {
      setEventInfo(prev => ({ ...prev, customMessage: newMsg }));
      lastAutoMsgRef.current = newMsg;
      localStorage.setItem("lastAutoMsg", newMsg);
    }

    // Atualiza a referência para a próxima mudança
    prevEventInfoRef.current = { ...eventInfo };
  }, [
    eventInfo.projectName, 
    eventInfo.location, 
    eventInfo.prevSummary, 
    eventInfo.prizesList, 
    eventInfo.nextChallenge, 
    eventInfo.tonightPoints,
    activeTab
  ]);

  useEffect(() => {
    if (downloadCardId && qrDownloadRef.current) {
      setTimeout(() => {
        generateCardImage();
      }, 300);
    }
  }, [downloadCardId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants(search);
  };

  // ---- SORT / FILTER HELPERS ----
  const handleSortCol = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir(null); }
  };

  const getSortedFiltered = () => {
    let list = [...participants];
    // column filters
    if (colFilters.name) list = list.filter(p => p.name.toLowerCase().includes(colFilters.name.toLowerCase()));
    if (colFilters.email) list = list.filter(p => p.email?.toLowerCase().includes(colFilters.email.toLowerCase()));
    if (colFilters.phone) list = list.filter(p => p.phone?.toLowerCase().includes(colFilters.phone.toLowerCase()));
    if (colFilters.cardNumber) list = list.filter(p => p.cardNumber?.toLowerCase().includes(colFilters.cardNumber.toLowerCase()));
    if (colFilters.currentBalance) list = list.filter(p => p.currentBalance.includes(colFilters.currentBalance));
    if (colFilters.age) list = list.filter(p => p.age?.toLowerCase().includes(colFilters.age.toLowerCase()));
    if (colFilters.address) list = list.filter(p => p.address?.toLowerCase().includes(colFilters.address.toLowerCase()));
    if (colFilters.neighborhood) list = list.filter(p => p.neighborhood?.toLowerCase().includes(colFilters.neighborhood.toLowerCase()));
    // sort
    if (sortKey && sortDir) {
      list.sort((a, b) => {
        let av: any = a[sortKey as keyof ParticipantData];
        let bv: any = b[sortKey as keyof ParticipantData];
        if (sortKey === "currentBalance") { av = parseFloat(av); bv = parseFloat(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  };

  // ---- INLINE EDIT ----
  const startEdit = (p: ParticipantData) => {
    setEditingId(p.id);
    const count = allAttendance.filter(a => a.participantId === p.id).length;
    setEditData({ name: p.name, email: p.email, phone: p.phone, balance: parseFloat(p.currentBalance).toFixed(2), cardNumber: p.cardNumber || "", age: p.age || "", address: p.address || "", neighborhood: p.neighborhood || "", attendanceCount: count });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: "", email: "", phone: "", balance: "", cardNumber: "", age: "", address: "", neighborhood: "", attendanceCount: 0 });
  };

  const saveEdit = async (exit: boolean = true, showToast: boolean = true) => {
    if (!editingId || editLoading) return;
    setEditLoading(true);
    try {
      const res = await fetch("/api/admin/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: editingId,
          name: editData.name,
          email: editData.email,
          phone: editData.phone,
          age: editData.age,
          address: editData.address,
          neighborhood: editData.neighborhood,
          cardNumber: editData.cardNumber,
          currentBalance: editData.balance,
        }),
      });
      if (res.ok) {
        // ----- ATUALIZAÇÃO OTIMISTA (LOCAL) -----
        setParticipants(prev => prev.map(p =>
          p.id === editingId
            ? { ...p, ...editData, currentBalance: editData.balance }
            : p
        ));

        if (editData.attendanceCount !== undefined) {
          await fetch("/api/admin/attendance/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId: editingId, count: editData.attendanceCount })
          });

          // Atualiza localmente a lista de presenças para refletir o novo count sem recarregar tudo
          fetchAllAttendance();
        }

        if (showToast) toast.success("Participante atualizado!");
        if (exit) setEditingId(null);

        // Recarregar em background de forma SILENCIOSA para garantir sincronia total
        fetchParticipants(search, true);
      } else {
        const data = await res.json();
        if (showToast) toast.error(data.error || "Erro ao atualizar");
      }
    } catch {
      if (showToast) toast.error("Erro ao atualizar");
    } finally {
      setEditLoading(false);
    }
  };

  // ---- DOWNLOAD CARD ----
  const triggerDownload = (p: ParticipantData) => {
    setDownloadName(p.name);
    setDownloadCardId(p.cardId);
    setDownloadCardNumber(p.cardNumber || p.cardId);
  };

  const generateCardImage = () => {
    const canvas = document.createElement("canvas");
    // Landscape if template, portrait if default
    const w = cardTemplate ? 560 : 400;
    const h = cardTemplate ? 400 : 560;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const finishDraw = () => {
      if (cardTemplate) {
        // Draw QR code on top
        const qrCanvas = qrDownloadRef.current?.querySelector("canvas");
        if (qrCanvas) {
          ctx.drawImage(qrCanvas, templateQrX, templateQrY, templateQrSize, templateQrSize);
          
          // Desenhar o número do cartão acima do QR (proporcional ao tamanho do QR)
          ctx.fillStyle = "#1a1a2e";
          ctx.font = `bold ${Math.round(templateQrSize * 0.18)}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText(downloadCardNumber, templateQrX + templateQrSize / 2, templateQrY - (templateQrSize * 0.05));
        }
      } else {
        // Default design: name + QR + footer
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px Inter, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#1a1a2e";
        ctx.fillText(downloadName, w / 2, 110);
        const qrCanvas = qrDownloadRef.current?.querySelector("canvas");
        if (qrCanvas) {
          const qrSize = 220;
          ctx.drawImage(qrCanvas, (w - qrSize) / 2, 135, qrSize, qrSize);
        }
        ctx.fillStyle = "#6b7280";
        ctx.font = "14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`ID: ${downloadCardId}`, w / 2, 385);
        ctx.fillStyle = "#e5e3df";
        ctx.fillRect(20, 410, w - 40, 1);
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px Inter, Arial, sans-serif";
        ctx.fillText("Apresente este cartão para validar missões", w / 2, 440);
      }
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `cartao-${downloadName.replace(/\s/g, "_")}.png`;
      link.click();
      setDownloadCardId(null);
      toast.success("Cartão baixado!");
    };

    if (cardTemplate) {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Essencial para imagens hospedadas em CDN/S3
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        finishDraw();
      };
      img.onerror = () => {
        toast.error("Erro no carregamento da arte hospedada. Gerando cartão simples...");
        setCardTemplate(null);
        // Fallback pro cartão padrão sem quebrar a UI
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 16);
        ctx.fill();
        ctx.fillStyle = "#dc2626"; // red header to indicate error or fallback
        ctx.beginPath();
        ctx.roundRect(0, 0, w, 70, [16, 16, 0, 0]);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px Inter, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("♥ Viva Feliz", w / 2, 45);
        finishDraw();
      };
      img.src = cardTemplate;
    } else {
      // Default design header
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 16);
      ctx.fill();
      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.roundRect(0, 0, w, 70, [16, 16, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("♥ EventCard", w / 2, 45);
      finishDraw();
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Excluir participante "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch("/api/admin/participants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: id }),
      });
      if (res.ok) {
        toast.success("Participante excluído");
        fetchParticipants(search);
      } else toast.error("Erro ao excluir");
    } catch { toast.error("Erro ao excluir"); }
  };

  const handlePromote = async (userId: number, role: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) {
        toast.success(`Role atualizado para ${role}`);
        fetchAllUsers();
      } else toast.error("Erro ao alterar role");
    } catch { toast.error("Erro ao alterar role"); }
  };

  // ---- USER CRUD ----
  const startEditUser = (u: UserData) => {
    setEditingUserId(u.id);
    setEditUserData({ name: u.name, email: u.email, password: "" });
    setChangingPasswordId(null);
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditUserData({ name: "", email: "", password: "" });
  };

  const saveEditUser = async () => {
    if (!editingUserId) return;
    setEditUserLoading(true);
    try {
      const body: any = { userId: editingUserId, name: editUserData.name, email: editUserData.email };
      if (editUserData.password) body.password = editUserData.password;
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Usuário atualizado!");
        setEditingUserId(null);
        fetchAllUsers();
      } else toast.error(data.error || "Erro ao atualizar");
    } catch { toast.error("Erro ao atualizar"); }
    finally { setEditUserLoading(false); }
  };

  const handleChangePassword = async (userId: number) => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Senha alterada com sucesso!");
        setChangingPasswordId(null);
        setNewPassword("");
      } else toast.error(data.error || "Erro ao alterar senha");
    } catch { toast.error("Erro ao alterar senha"); }
    finally { setPasswordLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Preencha todos os campos"); return;
    }
    setCreateUserLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...newUser }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setNewUser({ name: "", email: "", password: "", role: "user" });
        setShowCreateUser(false);
        fetchAllUsers();
      } else toast.error(data.error);
    } catch { toast.error("Erro ao criar usuário"); }
    finally { setCreateUserLoading(false); }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`Excluir usuário "${name}"? Todos os dados relacionados serão removidos.`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Usuário excluído");
        fetchAllUsers();
        fetchParticipants(search);
      } else toast.error(data.error || "Erro ao excluir");
    } catch { toast.error("Erro ao excluir"); }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipant || !pointAmount) { toast.error("Selecione um participante e informe a pontuação"); return; }
    setPointLoading(true);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: parseInt(selectedParticipant), amount: pointAmount, description: pointDescription || "Missão validada pelo admin" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setSelectedParticipant("");
        setPointAmount("50");
        setPointDescription("");
        fetchParticipants(search);
      } else toast.error(data.error);
    } catch { toast.error("Erro ao lançar pontos"); }
    finally { setPointLoading(false); }
  };

  const exportCSV = () => {
    const headers = ["Nome", "Email", "Telefone", "Card ID", "Total de Pontos", "Data Criação"];
    const rows = participants.map((p) => [p.name, p.email, p.phone, p.cardId, `${parseFloat(p.currentBalance).toFixed(0)} pts`, new Date(p.createdAt).toLocaleDateString("pt-BR")]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "participantes.csv";
    link.click();
  };

  const exportFullBackupCSV = () => {
    const csvData = participants.map(p => {
      const presences = allAttendance.filter(a => a.participantId === p.id).length;
      return {
        "Nome Completo": p.name || "",
        "Email": p.email || "",
        "Telefone": p.phone || "",
        "Idade": p.age || "",
        "Endereço": p.address || "",
        "Bairro": p.neighborhood || "",
        "Nº Cartão": p.cardNumber || "",
        "ID Sis (NÃO MUDAR)": p.cardId || "",
        "Total de Pontos": parseFloat(p.currentBalance).toFixed(2),
        "Presenças Totais": presences,
        "Criado Em": new Date(p.createdAt).toLocaleDateString("pt-BR")
      };
    });
    const csvStr = Papa.unparse(csvData, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csvStr], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Backup-Geral-EventCard-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;
      let csvText = "";
      try {
        // Tenta decodificar como UTF-8 primeiro
        csvText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch (err) {
        // Se der erro (caractere quebrado), decodifica como Windows ANSI (o padrão que o Excel usa no Brasil)
        csvText = new TextDecoder("windows-1252").decode(buffer);
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          toast.info("Enviando dados para o servidor...");
          try {
            const res = await fetch("/api/admin/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: results.data }),
            });
            const json = await res.json();
            if (res.ok) {
              toast.success(json.message);
              fetchParticipants();
            } else toast.error(json.error);
          } catch { toast.error("Erro de conexão na importação"); }
        }
      });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // reset input
  };

  const handleMassPrint = () => {
    const startStr = prompt("Deseja imprimir uma FAIXA específica?\nDigite o Nº INICIAL do Cartão (ou deixe EM BRANCO para imprimir TUDO que está na tabela agora):");
    if (startStr === null) return;
    
    let toPrint = getSortedFiltered();

    if (startStr.trim() !== "") {
       const startNum = parseInt(startStr, 10);
       const endStr = prompt(`Imprimir a partir do nº ${startNum} até qual número? (Ex: 100)`);
       if (endStr === null) return;
       const endNum = parseInt(endStr, 10);
       
       if (!isNaN(startNum) && !isNaN(endNum)) {
         toPrint = toPrint.filter(p => {
            const cardNumStr = p.cardNumber || "";
            let numMatch = cardNumStr.match(/\d+/);
            if (!numMatch) {
              // try to get from name if it matches "Cartão #X"
              numMatch = p.name.match(/Cartão\s*#?\s*(\d+)/i) || p.name.match(/\d+/);
            }
            if (!numMatch) return false;
            const num = parseInt(numMatch[1] || numMatch[0], 10);
            return num >= startNum && num <= endNum;
         });
       } else {
         toast.error("Números inválidos fornecidos.");
         return;
       }
    }

    const cardsList = toPrint.map(p => ({
      cardId: p.cardId,
      name: p.name
    }));
    if (cardsList.length === 0) {
      toast.error("Nenhum participante atende a esse filtro/faixa!");
      return;
    }
    sessionStorage.setItem("printDataMass", JSON.stringify(cardsList));
    window.open(`/admin/print-cards`, '_blank');
  };

  const handleDeleteAttendance = async (id: number) => {
    if (!confirm("Remover esta presença?")) return;
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        toast.success("Presença removida!");
        fetchAllAttendance();
      } else toast.error("Erro ao remover");
    } catch { toast.error("Erro"); }
  };

  const updateEventInfo = async () => {
    setEventInfoLoading(true);
    try {
      const res = await fetch("/api/admin/settings/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventInfo)
      });
      const data = await res.json();
      if (res.ok) toast.success("Informações da noite salvas!");
      else {
        console.error("Erro detalhado:", data);
        toast.error(data.error || "Erro ao salvar");
      }
    } catch (err) {
      console.error("Erro fetch:", err);
      toast.error("Erro no servidor");
    } finally {
      setEventInfoLoading(false);
    }
  };

  const exportTemplateCSV = () => {
    const csv = "Nome,Idade,Email,Telefone,Cartao,Pontos,Endereco,Bairro\nJoão da Silva,25,joao@email.com,11999999999,031,50,Rua Exemplo 123,Centro\nMaria Santos,,,,,,,";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao.csv";
    link.click();
  };

  // ---- BATCH CARDS ----
  const [batchQty, setBatchQty] = useState("20");
  const [batchLoading, setBatchLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [assignCardId, setAssignCardId] = useState("");
  const [assignName, setAssignName] = useState("");
  const [assignPhone, setAssignPhone] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // ---- PRINT RANGE MODAL ----
  const [printModal, setPrintModal] = useState<{ type: 'mass' | 'unassigned' | null, isOpen: boolean }>({ type: null, isOpen: false });
  const [printStart, setPrintStart] = useState("");
  const [printEnd, setPrintEnd] = useState("");

  const handleOpenPrintModal = (type: 'mass' | 'unassigned') => {
    setPrintStart("");
    setPrintEnd("");
    setPrintModal({ type, isOpen: true });
  };

  const handleConfirmPrintRange = () => {
    let toPrint = printModal.type === 'mass' ? getSortedFiltered() : unassignedCards;

    if (printStart.trim() !== "" || printEnd.trim() !== "") {
       const startNum = parseInt(printStart, 10);
       const endNum = parseInt(printEnd, 10);
       
       if (!isNaN(startNum) && !isNaN(endNum)) {
         toPrint = toPrint.filter(p => {
            const cardNumStr = p.cardNumber || "";
            let numMatch = cardNumStr.match(/\d+/);
            if (!numMatch) {
              numMatch = p.name.match(/Cartão\s*#?\s*(\d+)/i) || p.name.match(/\d+/);
            }
            if (!numMatch) return false;
            const num = parseInt(numMatch[1] || numMatch[0], 10);
            return num >= startNum && num <= endNum;
         });
       } else if (printStart.trim() !== "" || printEnd.trim() !== "") {
         toast.error("Números inválidos fornecidos.");
         return;
       }
    }

    const cardsList = toPrint.map((p: any) => ({
      cardId: p.cardId,
      name: p.name,
      cardNumber: p.cardNumber
    }));

    if (cardsList.length === 0) {
      toast.error("Nenhum cartão atende a essa faixa!");
      return;
    }
    
    sessionStorage.setItem("printDataMass", JSON.stringify(cardsList));
    window.open(`/admin/print-cards`, '_blank');
    setPrintModal({ type: null, isOpen: false });
  };

  const handleGenerateBatch = async () => {
    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/batch-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: parseInt(batchQty) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchUnassignedCards();
        fetchParticipants();

        // Open print page with generated cards
        const cardsForPrint = data.cards.map((c: any) => ({ cardId: c.cardId, name: c.name, cardNumber: c.cardNumber }));
        const encoded = encodeURIComponent(JSON.stringify(cardsForPrint));
        window.open(`/admin/print-cards?cards=${encoded}`, '_blank');
      } else toast.error(data.error);
    } catch { toast.error("Erro ao gerar cartões"); }
    finally { setBatchLoading(false); }
  };

  const handlePrintUnassigned = () => {
    handleOpenPrintModal('unassigned');
  };

  const handleAssignCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCardId || !assignName) {
      toast.error("Preencha o Número do cartão e o nome do convidado"); return;
    }
    setAssignLoading(true);
    try {
      // Find the participant by cardId or cardNumber
      const card = unassignedCards.find(c => c.cardNumber === assignCardId || c.cardId === assignCardId) ||
        participants.find(c => c.cardNumber === assignCardId || c.cardId === assignCardId);
      if (!card) {
        toast.error("Cartão não encontrado. Verifique o Número.");
        setAssignLoading(false);
        return;
      }
      const res = await fetch("/api/admin/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: card.id,
          name: assignName,
          email: `${assignName.toLowerCase().replace(/\s/g, '.')}@evento.local`,
          phone: assignPhone || "---",
        }),
      });
      if (res.ok) {
        toast.success(`Cartão número ${assignCardId} vinculado a "${assignName}"!`);
        setAssignCardId("");
        setAssignName("");
        setAssignPhone("");
        fetchUnassignedCards();
        fetchParticipants();
      } else toast.error("Erro ao vincular cartão");
    } catch { toast.error("Erro ao vincular cartão"); }
    finally { setAssignLoading(false); }
  };

  const handleQuickAssign = async (card: ParticipantData) => {
    const nome = prompt(`Digite o nome do convidado para o cartão ${card.cardId}:`);
    if (!nome) return;
    try {
      const res = await fetch("/api/admin/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: card.id,
          name: nome,
          email: `${nome.toLowerCase().replace(/\s/g, '.')}@evento.local`,
        }),
      });
      if (res.ok) {
        toast.success(`Vinculado a "${nome}"!`);
        fetchUnassignedCards();
        fetchParticipants();
      } else toast.error("Erro ao vincular");
    } catch { toast.error("Erro"); }
  };

  const handleLogout = async () => { await logout(); router.push("/"); };

  if (!user || user.role !== "admin") return null;

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: "cartoes", label: "🏷️ Cartões" },
    { key: "aprovacoes", label: "Aprovações", count: isMounted ? pendingUsers.length : 0 },
    { key: "participantes", label: "Participantes", count: isMounted ? participants.length : 0 },
    { key: "presenca", label: "📍 Lista de Presença" },
    { key: "gestao_noite", label: "🗓️ Info da Noite" },
    { key: "resgate", label: "📩 Resgate (Faltaram)", count: isMounted ? absentees.length : 0 },
    { key: "reforco", label: "✨ Reforço (Compareceram)", count: isMounted ? attendees.length : 0 },
    { key: "pontos", label: "Lançar Pontos" },
    { key: "ranking", label: "Ranking" },
    { key: "usuarios", label: "Administradores", count: isMounted ? allUsers.length : 0 },
  ];

  const iconBtnStyle = (bg: string): React.CSSProperties => ({
    background: bg, color: 'white', border: 'none', borderRadius: '0.5rem',
    padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.2s',
  });

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Hidden QR for download */}
      {downloadCardId && (
        <div ref={qrDownloadRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <QRCodeCanvas value={downloadCardId} size={256} level="H" includeMargin={false} />
        </div>
      )}

      {/* Input global para importação CSV */}
      <input id="csv-upload" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'rgba(250,249,247,0.85)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Heart style={{ width: 24, height: 24, color: 'var(--accent)', fill: 'var(--accent)' }} />
            <h1 style={{ fontSize: '1.2rem', margin: 0 }} className="hide-on-mobile">Viva Feliz Admin</h1>
            <h1 style={{ fontSize: '1rem', margin: 0, display: 'none' }} className="show-on-mobile">V. Feliz Admin</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => router.push("/volunteer/scanner")} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              <QrCode style={{ width: 14, height: 14 }} /> <span className="hide-on-mobile">Scanner</span>
            </button>
            <button onClick={handleLogout} className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              <LogOut style={{ width: 14, height: 14 }} /> <span className="hide-on-mobile">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }} className="no-scrollbar">
            {tabs.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '0.6rem 1rem', background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-2px', fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--muted-foreground)',
                cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
              }}>
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          {/* ===== Tab: Aprovações ===== */}
          {activeTab === "aprovacoes" && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Aprovações Pendentes</h2>
              {pendingUsers.length === 0 ? (
                <div className="card-elegant" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-foreground)' }}>
                  Nenhuma solicitação pendente
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="card-elegant" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{u.name}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{u.email}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handlePromote(u.id, "volunteer")} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>Voluntário</button>
                        <button onClick={() => handlePromote(u.id, "admin")} className="btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>Admin</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* ===== Tab: Participantes ===== */}
          {activeTab === "participantes" && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Gerenciar Participantes</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={() => setCreateParticipantModal(true)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    <Plus style={{ width: 14, height: 14 }} /> Novo Participante
                  </button>
                  <button onClick={() => setShowExtraCols(!showExtraCols)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    {showExtraCols ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                  </button>
                  <button onClick={() => handleOpenPrintModal('mass')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                    <Printer style={{ width: 14, height: 14 }} /> Imprimir Todos
                  </button>
                  <button onClick={exportFullBackupCSV} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Download style={{ width: 14, height: 14 }} /> Exportar Completo
                  </button>
                </div>
              </div>

              {/* Modal de Criar Participante Manual */}
              {createParticipantModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                  <div className="card-elegant animate-fade-in" style={{ padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Cadastro Manual</h3>
                      <button onClick={() => setCreateParticipantModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X style={{ width: 20, height: 20, color: '#6b7280' }}/></button>
                    </div>
                    <form onSubmit={handleCreateParticipant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nome Completo *</label>
                        <input value={newParticipantData.name} onChange={e => setNewParticipantData({...newParticipantData, name: e.target.value})} className="input-elegant" required />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email (opcional)</label>
                          <input type="email" value={newParticipantData.email} onChange={e => setNewParticipantData({...newParticipantData, email: e.target.value})} className="input-elegant" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Telefone (opcional)</label>
                          <input value={newParticipantData.phone} onChange={e => setNewParticipantData({...newParticipantData, phone: e.target.value})} className="input-elegant" />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Idade (opcional)</label>
                          <input value={newParticipantData.age} onChange={e => setNewParticipantData({...newParticipantData, age: e.target.value})} className="input-elegant" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nº do Cartão (opicional)</label>
                          <select 
                            value={newParticipantData.cardNumber} 
                            onChange={e => setNewParticipantData({...newParticipantData, cardNumber: e.target.value})} 
                            className="input-elegant"
                            style={{ cursor: 'pointer' }}
                          >
                            <option value="">Nenhum (atribuir depois)</option>
                            {unassignedCards.map(c => (
                              <option key={c.id} value={c.cardNumber}>
                                Cartão {c.cardNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Endereço (opcional)</label>
                          <input value={newParticipantData.address} onChange={e => setNewParticipantData({...newParticipantData, address: e.target.value})} className="input-elegant" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Bairro (opcional)</label>
                          <input value={newParticipantData.neighborhood} onChange={e => setNewParticipantData({...newParticipantData, neighborhood: e.target.value})} className="input-elegant" />
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        * Pode deixar o Nº do Cartão em branco para atribuir depois usando o botão de Trocar Cartão (🔄) na lista abaixo.
                      </p>
                      <button type="submit" disabled={createParticipantLoading} className="btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                        {createParticipantLoading ? <Loader2 className="animate-spin m-auto" size={18} /> : "Cadastrar Participante"}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--muted-foreground)' }} />
                  <input type="text" placeholder="Buscar por nome, email ou cardId..." value={search}
                    onChange={(e) => { setSearch(e.target.value); if (!e.target.value) fetchParticipants(); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                    className="input-elegant" style={{ paddingLeft: '2.5rem' }} />
                </div>
              </form>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Loader2 style={{ width: 32, height: 32, color: 'var(--accent)' }} className="animate-spin" />
                </div>
              ) : (
                <div className="table-responsive-container card-elegant" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }} className="mobile-card-table">
                      <thead>
                        {/* Sortable header row */}
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.03)' }}>
                          {([
                            { label: 'Nome', key: 'name' },
                            { label: 'Idade', key: 'age', hidden: !showExtraCols },
                            { label: 'Endereço', key: 'address', hidden: !showExtraCols },
                            { label: 'Bairro', key: 'neighborhood', hidden: !showExtraCols },
                            { label: 'Email', key: 'email', hidden: !showExtraCols },
                            { label: 'Telefone', key: 'phone', hidden: !showExtraCols },
                            { label: 'Cartão', key: 'cardNumber' },
                            { label: 'Saldo', key: 'currentBalance' },
                            { label: 'Presenças', key: 'name' },
                          ] as { label: string; key: SortKey; hidden?: boolean }[]).map(({ label, key, hidden }) => (
                            !hidden && <th key={key}
                              onClick={() => handleSortCol(key)}
                              style={{
                                textAlign: key === 'currentBalance' ? 'right' : 'left',
                                padding: '0.6rem 0.5rem', fontWeight: 600, fontSize: '0.85rem',
                                fontFamily: 'Inter, sans-serif', cursor: 'pointer', userSelect: 'none',
                                whiteSpace: 'nowrap',
                                color: sortKey === key ? 'var(--accent)' : undefined,
                              }}
                            >
                              {label}{' '}
                              {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
                            </th>
                          ))}
                          <th style={{ textAlign: 'center', padding: '0.6rem 0.5rem', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>Ações</th>
                        </tr>
                        {/* Filter row */}
                        <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.015)' }} className="hide-on-mobile">
                          <td style={{ padding: '0.35rem 0.5rem' }}>
                            <input
                              placeholder="Filtrar nome..."
                              value={colFilters.name}
                              onChange={(e) => setColFilters({ ...colFilters, name: e.target.value })}
                              className="input-elegant"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', minWidth: 60 }}
                            />
                          </td>
                          {showExtraCols && (
                            <>
                              <td style={{ padding: '0.35rem 0.5rem' }}>
                                <input placeholder="..." value={colFilters.age}
                                  onChange={(e) => setColFilters({ ...colFilters, age: e.target.value })}
                                  className="input-elegant" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', minWidth: 40 }} />
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem' }}>
                                <input placeholder="..." value={colFilters.address}
                                  onChange={(e) => setColFilters({ ...colFilters, address: e.target.value })}
                                  className="input-elegant" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%' }} />
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem' }}>
                                <input placeholder="..." value={colFilters.neighborhood}
                                  onChange={(e) => setColFilters({ ...colFilters, neighborhood: e.target.value })}
                                  className="input-elegant" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%' }} />
                              </td>
                            </>
                          )}
                          {showExtraCols && (
                            <>
                              <td style={{ padding: '0.35rem 0.5rem' }}>
                                <input
                                  placeholder="Email..."
                                  value={colFilters.email}
                                  onChange={(e) => setColFilters({ ...colFilters, email: e.target.value })}
                                  className="input-elegant"
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', minWidth: 60 }}
                                />
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem' }}>
                                <input
                                  placeholder="Fone..."
                                  value={colFilters.phone}
                                  onChange={(e) => setColFilters({ ...colFilters, phone: e.target.value })}
                                  className="input-elegant"
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', minWidth: 60 }}
                                />
                              </td>
                            </>
                          )}
                          <td style={{ padding: '0.35rem 0.5rem' }}>
                            <input
                              placeholder="Cartão..."
                              value={colFilters.cardNumber}
                              onChange={(e) => setColFilters({ ...colFilters, cardNumber: e.target.value })}
                              className="input-elegant"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', minWidth: 60 }}
                            />
                          </td>
                          <td style={{ padding: '0.35rem 0.5rem' }}>
                            <input
                              placeholder="Filtrar saldo"
                              value={colFilters.currentBalance}
                              onChange={(e) => setColFilters({ ...colFilters, currentBalance: e.target.value })}
                              className="input-elegant"
                              style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', width: '100%', minWidth: 60 }}
                            />
                          </td>
                          <td />
                          <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                            <button
                              onClick={() => setColFilters({ name: '', email: '', phone: '', cardNumber: '', currentBalance: '', age: '', address: '', neighborhood: '' })}
                              title="Limpar filtros"
                              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '0.4rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}
                            >✕</button>
                          </td>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedFiltered().map((p) => (
                          <tr
                            key={p.id}
                            onDoubleClick={() => startEdit(p)}
                            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                            title="Clique duplo para editar"
                          >
                            {editingId === p.id ? (
                              <>
                                <td style={{ padding: '0.5rem' }}>
                                  <input value={editData.name} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                                </td>
                                {showExtraCols && <td style={{ padding: '0.5rem' }}>
                                  <input value={editData.age} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, age: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '60px' }} placeholder="Ex: 25" />
                                </td>}
                                {showExtraCols && <td style={{ padding: '0.5rem' }}>
                                  <input value={editData.address} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, address: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '120px' }} placeholder="Ex: Rua X" />
                                </td>}
                                {showExtraCols && <td style={{ padding: '0.5rem' }}>
                                  <input value={editData.neighborhood} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, neighborhood: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '100px' }} placeholder="Ex: Centro" />
                                </td>}
                                {showExtraCols && (
                                  <>
                                    <td style={{ padding: '0.5rem' }}>
                                      <input value={editData.email} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                                    </td>
                                    <td style={{ padding: '0.5rem' }}>
                                      <input value={editData.phone} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                                    </td>
                                  </>
                                )}
                                <td style={{ padding: '0.5rem' }}>
                                  <input value={editData.cardNumber || p.cardNumber || ''} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, cardNumber: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input
                                    type="number" step="0.01" min="0"
                                    value={editData.balance}
                                    onBlur={() => saveEdit(false, false)}
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)}
                                    onChange={(e) => setEditData({ ...editData, balance: e.target.value })}
                                    className="input-elegant"
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '90px', textAlign: 'right' }}
                                  />
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                  <input type="number" min="0" value={editData.attendanceCount} onBlur={() => saveEdit(false, false)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(true, true)} onChange={(e) => setEditData({ ...editData, attendanceCount: parseInt(e.target.value) || 0 })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', width: '60px', textAlign: 'center' }} />
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                    <button onClick={() => saveEdit(true, true)} disabled={editLoading} title="Salvar" style={iconBtnStyle('#16a34a')}>
                                      {editLoading ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : <Check style={{ width: 15, height: 15 }} />}
                                    </button>
                                    <button onClick={cancelEdit} title="Cancelar" style={iconBtnStyle('#6b7280')}>
                                      <X style={{ width: 15, height: 15 }} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem' }} data-label="Nome">{p.name}</td>
                                {showExtraCols && <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem' }} data-label="Idade">{p.age || '---'}</td>}
                                {showExtraCols && <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }} data-label="Endereço">{p.address || '---'}</td>}
                                {showExtraCols && <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }} data-label="Bairro">{p.neighborhood || '---'}</td>}
                                {showExtraCols && (
                                  <>
                                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }} data-label="Email">{p.email || '---'}</td>
                                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }} data-label="Fone">{p.phone || '---'}</td>
                                  </>
                                )}
                                <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent)' }} data-label="Cartão">{p.cardNumber || '---'}</td>
                                <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }} data-label="Saldo">{isMounted ? parseFloat(p.currentBalance).toFixed(0) : "0"} pts</td>
                                <td style={{ padding: '0.6rem 0.5rem', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', color: '#6366f1' }} data-label="Presenças">{isMounted ? allAttendance.filter(a => a.participantId === p.id).length : "0"}</td>
                                <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }} className="actions-cell">
                                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                    <button onClick={() => triggerDownload(p)} title="Baixar Cartão" style={iconBtnStyle('var(--accent)')}><Download style={{ width: 13, height: 13 }} /></button>
                                    <button onClick={() => startEdit(p)} title="Editar" style={iconBtnStyle('var(--accent)')}><Pencil style={{ width: 13, height: 13 }} /></button>
                                    <button onClick={() => setTransferParticipant(p)} title="Trocar Cartão" style={iconBtnStyle('#f59e0b')}><RefreshCw style={{ width: 13, height: 13 }} /></button>
                                    {showExtraCols && <button onClick={() => handleDelete(p.id, p.name)} title="Excluir" style={iconBtnStyle('#dc2626')}><Trash2 style={{ width: 13, height: 13 }} /></button>}
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                        {getSortedFiltered().length === 0 && (
                          <tr><td colSpan={showExtraCols ? 10 : 5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Nenhum participante encontrado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          )}

          {/* ===== Tab: Adicionar Créditos ===== */}
          {activeTab === "pontos" && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Lançar Pontos</h2>
              </div>
              <div className="card-elegant">
                <form onSubmit={handleAddPoints} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label className="label-elegant">Participante</label>
                    <select value={selectedParticipant} onChange={(e) => setSelectedParticipant(e.target.value)} className="input-elegant" style={{ cursor: 'pointer' }} required>
                      <option value="">Selecione um participante</option>
                      {participants.map((p) => (<option key={p.id} value={p.id}>{p.name} — {p.email}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-elegant">Pontos</label>
                    <input type="number" step="1" min="1" value={pointAmount} onChange={(e) => setPointAmount(e.target.value)} className="input-elegant" required />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="label-elegant">Descrição (opcional)</label>
                    <input type="text" placeholder="Missão validada pelo admin" value={pointDescription} onChange={(e) => setPointDescription(e.target.value)} className="input-elegant" />
                  </div>
                  <div>
                    <button type="submit" disabled={pointLoading} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                      {pointLoading ? (<><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Processando...</>) : (<><Plus style={{ width: 16, height: 16 }} /> Lançar Pontos</>)}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ===== Tab: Ranking ===== */}
          {activeTab === "ranking" && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>🏆 Ranking de Pontos</h2>
              <div className="table-responsive-container card-elegant" style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} className="mobile-card-table">
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ textAlign: 'left', padding: '0.8rem 1rem', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>Posição</th>
                        <th style={{ textAlign: 'left', padding: '0.8rem 1rem', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>Nome</th>
                        <th style={{ textAlign: 'left', padding: '0.8rem 1rem', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>Nº Cartão</th>
                        <th style={{ textAlign: 'right', padding: '0.8rem 1rem', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>Pontuação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...participants]
                        .sort((a, b) => parseFloat(b.currentBalance) - parseFloat(a.currentBalance))
                        .map((p, index) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: index < 3 ? 'rgba(99,102,241,0.03)' : 'transparent' }}>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 700, color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'var(--muted-foreground)' }} data-label="Posição">
                               {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: index < 3 ? 600 : 400 }} data-label="Nome">{p.name}</td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent)' }} data-label="Cartão">{p.cardNumber || '---'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 800, textAlign: 'right', color: 'var(--accent)' }} data-label="Pontos">
                              {parseFloat(p.currentBalance).toFixed(0)} pts
                            </td>
                          </tr>
                        ))}
                      {participants.length === 0 && (
                        <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Nenhum participante encontrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          )}

          {/* ===== Tab: Usuários ===== */}
          {activeTab === "usuarios" && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Gerenciar Usuários</h2>
                <button onClick={() => setShowCreateUser(!showCreateUser)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  <UserPlus style={{ width: 14, height: 14 }} /> Novo Usuário
                </button>
              </div>

              {/* Create User Form */}
              {showCreateUser && (
                <div className="card-elegant" style={{ marginBottom: '1rem', border: '2px solid #6366f1' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#6366f1' }}>Criar Novo Usuário</h3>
                  <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Nome</label>
                      <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="input-elegant" placeholder="Nome completo" required />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Email</label>
                      <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input-elegant" placeholder="email@exemplo.com" required />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Senha</label>
                      <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input-elegant" placeholder="Mínimo 6 caracteres" minLength={6} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Role</label>
                      <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="input-elegant" style={{ cursor: 'pointer' }}>
                        <option value="user">Usuário</option>
                        <option value="volunteer">Voluntário</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" disabled={createUserLoading} className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                        {createUserLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <><UserPlus style={{ width: 14, height: 14 }} /> Criar Usuário</>}
                      </button>
                      <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* User Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allUsers.map((u) => (
                  <div key={u.id} className="card-elegant" style={{ padding: '1rem 1.25rem' }}>
                    {editingUserId === u.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Nome</label>
                            <input value={editUserData.name} onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Email</label>
                            <input value={editUserData.email} onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Nova Senha (opcional)</label>
                            <input type="password" value={editUserData.password} onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })} className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="Deixe vazio para manter" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={saveEditUser} disabled={editUserLoading} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            {editUserLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <><Check style={{ width: 14, height: 14 }} /> Salvar</>}
                          </button>
                          <button onClick={cancelEditUser} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            <X style={{ width: 14, height: 14 }} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                            <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem' }}>{u.name}</p>
                            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>{u.email}</p>
                            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>ID: {u.id} · {new Date(u.createdAt).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            <select
                              value={u.role}
                              onChange={(e) => handlePromote(u.id, e.target.value)}
                              style={{
                                background: u.role === 'admin' ? '#6366f1' : u.role === 'volunteer' ? '#16a34a' : '#6b7280',
                                color: 'white', border: 'none', borderRadius: '999px',
                                padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                appearance: 'none', WebkitAppearance: 'none',
                                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e")',
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '1rem',
                                paddingRight: '1.6rem',
                              }}
                            >
                              <option value="user">Usuário</option>
                              <option value="volunteer">Voluntário</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button onClick={() => setChangingPasswordId(changingPasswordId === u.id ? null : u.id)} title="Alterar Senha" style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Key style={{ width: 16, height: 16 }} />
                            </button>
                            <button onClick={() => startEditUser(u)} title="Editar" style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Pencil style={{ width: 16, height: 16 }} />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)} title="Excluir" style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 style={{ width: 16, height: 16 }} />
                            </button>
                          </div>
                        </div>
                        {/* Inline password change */}
                        {changingPasswordId === u.id && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <label style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Nova Senha</label>
                              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-elegant" placeholder="Mínimo 6 caracteres" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                            </div>
                            <button onClick={() => handleChangePassword(u.id)} disabled={passwordLoading} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', flexShrink: 0 }}>
                              {passwordLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <><Key style={{ width: 14, height: 14 }} /> Salvar Senha</>}
                            </button>
                            <button onClick={() => { setChangingPasswordId(null); setNewPassword(""); }} className="btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flexShrink: 0 }}>
                              <X style={{ width: 14, height: 14 }} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {allUsers.length === 0 && (
                  <div className="card-elegant" style={{ textAlign: 'center', padding: '2.5rem', color: '#6b7280' }}>
                    Nenhum usuário encontrado
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Tab: Cartões ===== */}
          {activeTab === "cartoes" && (
            <div className="animate-fade-in">
              <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Cartões Pré-Impressos</h2>

              {/* Arte do Cartão */}
              <div className="card-elegant" style={{ marginBottom: '1rem', border: '2px solid #f59e0b' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f59e0b' }}>🎨 Arte do Cartão</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                  Faça upload de uma imagem JPG/PNG para usar como fundo dos cartões. O QR code será sobreposto na posição configurada.
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Upload + preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <label className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          📁 Escolher imagem
                          <input type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64 = ev.target?.result as string;
                                setCardTemplate(base64);
                                localStorage.setItem("cardTemplateImage", base64);
                                // Save to server
                                fetch("/api/admin/settings", {
                                  method: "POST",
                                  body: JSON.stringify({ cardTemplateImage: base64 })
                                }).then(() => toast.success("Arte salva com sucesso!"));
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {cardTemplate && (
                          <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            onClick={() => {
                              setCardTemplate(null);
                              localStorage.removeItem("cardTemplateImage");
                              fetch("/api/admin/settings", { method: "POST", body: JSON.stringify({ cardTemplateImage: null }) });
                              toast.success("Arte removida");
                            }}>
                            🗑️ Remover
                          </button>
                        )}
                      </div>
                    </label>
                    {cardTemplate && (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={cardTemplate} alt="Template" style={{ width: '240px', height: 'auto', borderRadius: '0.5rem', border: '2px solid #f59e0b', display: 'block' }} />
                        {/* QR overlay preview */}
                        <div style={{ position: 'absolute', top: `${templateQrY / 400 * 100}%`, left: `${templateQrX / 560 * 100}%`, width: `${templateQrSize / 560 * 100}%`, border: '2px dashed #6366f1', background: 'rgba(99,102,241,0.15)', aspectRatio: '1' }}>
                          <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700, padding: '2px' }}>QR</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* QR position controls */}
                  {cardTemplate && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', flex: '1', minWidth: '200px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>QR Posição X (px)</label>
                        <input type="number" value={templateQrX} min={0} max={540}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTemplateQrX(val);
                            localStorage.setItem("cardTemplateQrX", String(val));
                          }}
                          className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>QR Posição Y (px)</label>
                        <input type="number" value={templateQrY} min={0} max={380}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTemplateQrY(val);
                            localStorage.setItem("cardTemplateQrY", String(val));
                          }}
                          className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Tamanho QR (px)</label>
                        <input type="number" value={templateQrSize} min={60} max={350}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setTemplateQrSize(val);
                            localStorage.setItem("cardTemplateQrSize", String(val));
                          }}
                          className="input-elegant" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <button 
                          onClick={saveCardDesign} 
                          disabled={designLoading}
                          className="btn-primary" 
                          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: '#f59e0b', borderColor: '#d97706' }}
                        >
                          {designLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <><Save style={{ width: 14, height: 14 }} /> Salvar Design</>}
                        </button>
                        <p style={{ fontSize: '0.7rem', color: '#9ca3af', lineHeight: '1.2' }}>Canvas: 560×400px. Ajuste e clique em salvar.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 1: Generate batch */}
              <div className="card-elegant" style={{ marginBottom: '1rem', border: '2px solid #6366f1' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#6366f1' }}>1️⃣ Gerar Lote de Cartões</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                  Gera cartões em branco com QR Code. Cada cartão recebe um ID único. Depois é só imprimir e entregar aos convidados.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Quantidade</label>
                    <input type="number" min={1} max={200} value={batchQty} onChange={(e) => setBatchQty(e.target.value)} className="input-elegant" style={{ width: '100px', padding: '0.4rem 0.6rem' }} />
                  </div>
                  <button onClick={handleGenerateBatch} disabled={batchLoading} className="btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                    {batchLoading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <><Plus style={{ width: 14, height: 14 }} /> Gerar Lote</>}
                  </button>
                  <button 
                    onClick={() => {
                      const sample = [{ cardId: "SAMPLE-123", name: "XXX" }];
                      sessionStorage.setItem("printDataMass", JSON.stringify(sample));
                      window.open(`/admin/print-cards`, '_blank');
                    }} 
                    className="btn-secondary" 
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' }}
                  >
                    <Eye style={{ width: 14, height: 14 }} /> Visualizar Exemplo
                  </button>
                  {unassignedCards.length > 0 && (
                    <button onClick={handlePrintUnassigned} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                      <Printer style={{ width: 14, height: 14 }} /> Reimprimir ({unassignedCards.length})
                    </button>
                  )}
                </div>
              </div>



            </div>
          )}

          {/* ===== Tab: Gestão da Noite ===== */}
          {activeTab === "gestao_noite" && (
            <div className="animate-fade-in space-y-6">
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>🗓️ Gestão da Missão e WhatsApp</h2>
              <div className="card-elegant space-y-5">
                <div>
                  <label className="label-elegant">📛 Nome do Projeto</label>
                  <input
                    type="text"
                    value={eventInfo.projectName}
                    onChange={(e) => setEventInfo({ ...eventInfo, projectName: e.target.value })}
                    className="input-elegant"
                    placeholder="Ex: Vida Nova"
                  />
                </div>
                <div>
                  <label className="label-elegant">📍 Local do Encontro</label>
                  <input
                    type="text"
                    value={eventInfo.location}
                    onChange={(e) => setEventInfo({ ...eventInfo, location: e.target.value })}
                    className="input-elegant"
                    placeholder="Ex: Rua Direita, 10 - Centro"
                  />
                </div>
                <div>
                  <label className="label-elegant">📝 Resumo da Palestra Anterior</label>
                  <textarea
                    value={eventInfo.prevSummary}
                    onChange={(e) => setEventInfo({ ...eventInfo, prevSummary: e.target.value })}
                    className="input-elegant min-h-[100px]"
                    placeholder="O que falamos ontem..."
                  />
                </div>
                <div>
                  <label className="label-elegant">🎁 Lista de Prêmios Atuais</label>
                  <textarea
                    value={eventInfo.prizesList}
                    onChange={(e) => setEventInfo({ ...eventInfo, prizesList: e.target.value })}
                    className="input-elegant min-h-[100px]"
                    placeholder="Fogão, Panela de Pressão..."
                  />
                </div>
                <div>
                  <label className="label-elegant">🎯 Desafio(s) do Dia</label>
                  <textarea
                    value={eventInfo.nextChallenge}
                    onChange={(e) => setEventInfo({ ...eventInfo, nextChallenge: e.target.value })}
                    className="input-elegant min-h-[100px]"
                    placeholder="DESAFIO VENCIDO - 300 pontos..."
                  />
                </div>
                <div>
                  <label className="label-elegant">🏅 Regras de Pontos da Noite</label>
                  <textarea
                    value={eventInfo.tonightPoints}
                    onChange={(e) => setEventInfo({ ...eventInfo, tonightPoints: e.target.value })}
                    className="input-elegant min-h-[100px]"
                    placeholder="Presença, Traga amigo..."
                  />
                </div>
                <div>
                  <label className="label-elegant">📍 Pontos por Presença (Automático no Scan)</label>
                  <input
                    type="number"
                    value={eventInfo.attPoints || "50"}
                    onChange={(e) => setEventInfo({ ...eventInfo, attPoints: e.target.value })}
                    className="input-elegant"
                  />
                </div>
                <div>
                  <label className="label-elegant text-indigo-600 font-bold flex items-center gap-2">
                    <QrCode style={{ width: 18, height: 18 }} /> 📱 MENSAGEM FINAL PARA WHATSAPP
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Esta é a mensagem que será enviada. Ela se atualiza sozinha conforme você preenche os campos acima, mas você pode editá-la livremente abaixo.
                  </p>
                  <textarea
                    value={eventInfo.customMessage || ""}
                    onChange={(e) => {
                      setEventInfo({ ...eventInfo, customMessage: e.target.value });
                      localStorage.setItem("lastAutoMsg", ""); // Para de auto-atualizar após edição manual
                    }}
                    className="input-elegant min-h-[300px] border-2 border-indigo-200 focus:border-indigo-500 bg-indigo-50/30"
                    placeholder="A mensagem final aparecerá aqui..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button 
                      type="button"
                      onClick={() => {
                        const newMsg = defaultWhatsAppTemplate(eventInfo);
                        setEventInfo({ ...eventInfo, customMessage: newMsg });
                        lastAutoMsgRef.current = newMsg;
                        localStorage.setItem("lastAutoMsg", newMsg);
                        toast.success("Mensagem restaurada para o padrão!");
                      }}
                      style={{ fontSize: '0.7rem', color: '#6366f1', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      Restaurar padrão automático
                    </button>
                  </div>
                </div>
                <button
                  onClick={updateEventInfo}
                  disabled={eventInfoLoading}
                  className="btn-primary w-full py-4 text-lg shadow-xl hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {eventInfoLoading ? <Loader2 className="animate-spin" /> : <><Check style={{ width: 20, height: 20 }} /> SALVAR TODA A CONFIGURAÇÃO</>}
                </button>
              </div>
            </div>
          )}

          {/* ===== Tab: Resgate (Zap) ===== */}
          {activeTab === "resgate" && (
            <div className="animate-fade-in space-y-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>📩 Resgate de Ausentes (WhatsApp)</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div className="card-elegant p-1.5" style={{ display: 'flex', gap: '0.4rem', marginBottom: 0, background: '#f8fafc', borderRadius: '1rem', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)' }}>
                    <button 
                      onClick={() => setResgateShowDone("pending")} 
                      className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${resgateShowDone === "pending" ? 'bg-indigo-600 text-white shadow-lg border-indigo-700 font-semibold' : 'hover:bg-white hover:shadow-sm border-transparent text-slate-600'}`}
                    >
                      Pendentes <span style={{ opacity: 0.8, fontSize: '0.7rem', background: resgateShowDone === "pending" ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '1px 6px', borderRadius: '999px' }}>{absentees.filter(a => a.processedResgate === 0 || a.processedResgate === 5).length}</span>
                    </button>
                    <button 
                      onClick={() => setResgateShowDone("done")} 
                      className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${resgateShowDone === "done" ? 'bg-indigo-600 text-white shadow-lg border-indigo-700 font-semibold' : 'hover:bg-white hover:shadow-sm border-transparent text-slate-600'}`}
                    >
                      Processados <span style={{ opacity: 0.8, fontSize: '0.7rem', background: resgateShowDone === "done" ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '1px 6px', borderRadius: '999px' }}>{absentees.filter(a => a.processedResgate === 1).length}</span>
                    </button>
                    <button 
                      onClick={() => setResgateShowDone("invalid")} 
                      className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${resgateShowDone === "invalid" ? 'bg-amber-500 text-white shadow-lg border-amber-600 font-semibold' : 'hover:bg-white hover:shadow-sm border-transparent text-slate-600'}`}
                    >
                      ⚠️ Corrigir <span style={{ opacity: 0.8, fontSize: '0.7rem', background: resgateShowDone === "invalid" ? 'rgba(255,255,255,0.2)' : '#fef3c7', padding: '1px 6px', borderRadius: '999px', color: resgateShowDone === "invalid" ? 'white' : '#92400e' }}>{absentees.filter(a => a.processedResgate === 4).length}</span>
                    </button>
                  </div>
                  {resgateShowDone === "done" && (
                    <button
                      onClick={async () => {
                        if (!confirm("Isso voltará TODOS os contatos para a lista de Pendentes (Resgate). Confirma?")) return;
                        const res = await fetch("/api/admin/participants", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ resetAllProcessed: "resgate" })
                        });
                        if (res.ok) { toast.success("Resgate resetado!"); fetchAbsentees(); }
                        else toast.error("Erro ao resetar");
                      }}
                      className="btn-secondary text-xs"
                    >
                      Zerar Todos da Lista
                    </button>
                  )}
                  <button onClick={fetchAbsentees} disabled={absenteesLoading} className="btn-secondary">
                    {absenteesLoading ? <Loader2 className="animate-spin" /> : "Atualizar"}
                  </button>
                </div>
              </div>

              <div className="card-elegant p-0 overflow-hidden">
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ textAlign: 'center', padding: '1rem', width: '120px' }}>Ações</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Nome</th>
                        {resgateShowDone === "invalid" && (
                          <>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Telefone</th>
                            <th style={{ textAlign: 'center', padding: '1rem', width: '60px' }}>Ok</th>
                            <th style={{ textAlign: 'center', padding: '1rem', width: '140px' }}>Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const seenPhones = new Set();
                        const isInvalidPhone = (phone: string) => {
                          if (!phone) return true;
                          const p = phone.toLowerCase();
                          return p === "" || p.includes("---") || p.includes("nao") || p.includes("informado") || p.includes("errado") || p.replace(/\D/g, '').length < 8;
                        };

                        const filtered = absentees
                          .filter(p => {
                            if (resgateShowDone === "done") return p.processedResgate !== 0 && p.processedResgate !== 4;
                            if (resgateShowDone === "invalid") return p.processedResgate === 4 || (p.processedResgate === 0 && isInvalidPhone(p.phone));
                            
                            // Para Pendentes:
                            if (p.processedResgate !== 0 && p.processedResgate !== 5) return false;
                            if (isInvalidPhone(p.phone)) return false;
                            
                            // Unicidade de telefone
                            const raw = (p.phone || '').replace(/\D/g, '');
                            if (seenPhones.has(raw)) return false;
                            seenPhones.add(raw);
                            
                            return true;
                          });

                        return filtered
                          .map((p, index) => {
                            const displayNum = filtered.length - index;
                            const buildMessage = () => {
                              if (eventInfo.customMessage && eventInfo.customMessage.trim() !== "") {
                                let customMsg = eventInfo.customMessage;
                                customMsg = customMsg.replace(/{nome}/g, (p.name || '').split(' ')[0]);
                                customMsg = customMsg.replace(/{proximo}/g, eventInfo.location);
                                customMsg = customMsg.replace(/{premios}/g, eventInfo.prizesList);
                                customMsg = customMsg.replace(/{resumo}/g, eventInfo.prevSummary);
                                customMsg = customMsg.replace(/{desafio}/g, eventInfo.nextChallenge);
                                customMsg = customMsg.replace(/{pontos}/g, eventInfo.tonightPoints);
                                customMsg = customMsg.replace(/{local}/g, eventInfo.location);
                                return customMsg;
                              }
                              return `Somos do Projeto *${eventInfo.projectName}*! ✨\n\nOi *${(p.name || '').split(' ')[0]}*! Passando pra te atualizar e te lembrar da nossa próxima missão! 🚀\n\n📝 *Resumo:* ${eventInfo.prevSummary}\n\nLembre-se que você pode ganhar prêmios incríveis com as pontuações acumuladas! 🎁\n\n*Prêmios como:*\n${eventInfo.prizesList}\n\n🎯 *O desafio de hoje é:*\n${eventInfo.nextChallenge}\n\n🏆 *Pontos hoje:*\n${eventInfo.tonightPoints}\n\n📍 *Nos encontramos em:*\n${eventInfo.location}\n\nTe esperamos lá! 🔥`;
                            };
                            const msg = buildMessage();
                            const rawPhone = (p.phone || '').replace(/\D/g, '');
                            const intlPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
                            const zapLink = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;

                            const updateProcessed = async (val: number) => {
                              setAbsentees(prev => prev.map(a => a.id === p.id ? { ...a, processedResgate: val } : a));
                              await fetch("/api/admin/participants", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ participantId: p.id, processedResgate: val })
                              });
                            };

                            const handleInvalid = () => {
                              updateProcessed(4);
                              toast.info("Movido para lista de correção");
                            };

                            const handleEnviado = () => {
                              updateProcessed(1);
                              toast.success("Marcado como enviado!");
                            };

                            return resgateEditId === p.id ? (
                              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: '#fefce8' }}>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                    <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                                      onClick={async () => {
                                        const res = await fetch(`/api/admin/participants`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ participantId: p.id, name: resgateEditData.name, phone: resgateEditData.phone })
                                        });
                                        if (res.ok) { toast.success('Salvo!'); fetchAbsentees(); setResgateEditId(null); }
                                        else toast.error('Erro ao salvar');
                                      }}>
                                      <Check style={{ width: 12, height: 12 }} />
                                    </button>
                                    <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                                      onClick={() => setResgateEditId(null)}>
                                      <X style={{ width: 12, height: 12 }} />
                                    </button>
                                  </div>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <input value={resgateEditData.name}
                                    onChange={(e) => setResgateEditData({ ...resgateEditData, name: e.target.value })}
                                    className="input-elegant" style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', width: '100%' }} />
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <input value={resgateEditData.phone} placeholder="Ex: 11999999999"
                                    onChange={(e) => setResgateEditData({ ...resgateEditData, phone: e.target.value })}
                                    className="input-elegant" style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', width: '100%' }} />
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <input type="checkbox" checked={p.processedResgate !== 0}
                                    onChange={(e) => updateProcessed(e.target.checked ? 1 : 0)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <select
                                    value={p.processedResgate}
                                    onChange={(e) => updateProcessed(Number(e.target.value))}
                                    style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.75rem', background: p.processedResgate === 1 ? '#dcfce7' : p.processedResgate === 3 ? '#e0e7ff' : p.processedResgate === 2 ? '#fee2e2' : p.processedResgate === 4 ? '#ffedd5' : p.processedResgate === 5 ? '#fef9c3' : '#f3f4f6', cursor: 'pointer', outline: 'none' }}
                                  >
                                    <option value={0}>⏳ Pendente</option>
                                    <option value={1}>✅ Enviado</option>
                                    <option value={5}>🔄 Em Processo</option>
                                    <option value={3}>💬 Respondeu</option>
                                    <option value={4}>🚫 Não é Zap</option>
                                    <option value={2}>❌ Falhou</option>
                                  </select>
                                </td>
                              </tr>
                            ) : (
                              <tr key={p.id}
                                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                onDoubleClick={() => { setResgateEditId(p.id); setResgateEditData({ name: p.name, phone: p.phone }); }}
                                title="Duplo clique para editar"
                              >
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                                    <div
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        // Abre a janela IMEDIATAMENTE antes do await para o browser não bloquear
                                        const newWin = window.open('', '_blank');
                                        
                                        const res = await fetch("/api/admin/participants", {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ participantId: p.id, lockResgate: true })
                                        });
                                        
                                        if (res.ok) {
                                          if (newWin) newWin.location.href = zapLink;
                                          fetchAbsentees();
                                        } else {
                                          if (newWin) newWin.close();
                                          const data = await res.json();
                                          if (data.error === "locked") {
                                            toast.error("⚠️ Já tem alguém enviando para este contato! Escolha o próximo.");
                                            fetchAbsentees();
                                          } else {
                                            toast.error("Erro ao travar contato");
                                          }
                                        }
                                      }}
                                      className="btn-primary"
                                      style={{ background: p.processedResgate === 5 ? '#94a3b8' : '#25D366', padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'inline-flex', gap: '0.4rem', width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                                      <Heart style={{ width: 14, height: 14, fill: 'white' }} /> {p.processedResgate === 5 ? 'Em Processo...' : 'Abrir Zap'}
                                    </div>
                                    {resgateShowDone === "pending" && (
                                      <div style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                                        <button onClick={handleEnviado} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.4rem', flex: 1, color: '#16a34a', borderColor: '#16a34a' }}>
                                          Enviado
                                        </button>
                                        <button onClick={handleInvalid} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.4rem', flex: 1, color: '#d97706', borderColor: '#d97706' }}>
                                          Não é Zap
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem' }}><span style={{ color: 'var(--muted-foreground)', marginRight: '0.4rem', fontSize: '0.8rem' }}>{displayNum}.</span>{p.name}</td>
                                {resgateShowDone === "invalid" && (
                                  <>
                                    <td style={{ padding: '1rem', color: p.phone ? 'inherit' : '#dc2626', fontStyle: p.phone ? 'normal' : 'italic' }}>
                                      {p.phone || '⚠ sem telefone'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                      <input type="checkbox" checked={p.processedResgate !== 0}
                                        onChange={(e) => updateProcessed(e.target.checked ? 1 : 0)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                      <select
                                        value={p.processedResgate}
                                        onChange={(e) => updateProcessed(Number(e.target.value))}
                                        style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.75rem', background: p.processedResgate === 1 ? '#dcfce7' : p.processedResgate === 3 ? '#e0e7ff' : p.processedResgate === 2 ? '#fee2e2' : p.processedResgate === 4 ? '#ffedd5' : p.processedResgate === 5 ? '#fef9c3' : '#f3f4f6', cursor: 'pointer', outline: 'none' }}
                                      >
                                        <option value={0}>⏳ Pendente</option>
                                        <option value={1}>✅ Enviado</option>
                                        <option value={5}>🔄 Em Processo</option>
                                        <option value={3}>💬 Respondeu</option>
                                        <option value={4}>🚫 Não é Zap</option>
                                        <option value={2}>❌ Falhou</option>
                                      </select>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          });
                      })()}
                      {absentees.filter(p => {
                        const isInvalid = (phone: string) => {
                          if (!phone) return true;
                          const ph = phone.toLowerCase();
                          return ph === "" || ph.includes("---") || ph.includes("nao") || ph.includes("informado") || ph.includes("errado") || ph.replace(/\D/g, '').length < 8;
                        };
                        if (resgateShowDone === "done") return p.processedResgate !== 0 && p.processedResgate !== 4;
                        if (resgateShowDone === "invalid") return p.processedResgate === 4 || (p.processedResgate === 0 && isInvalid(p.phone));
                        return p.processedResgate === 0 && !isInvalid(p.phone);
                      }).length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{resgateShowDone === "done" ? "Nenhum contato processado ainda." : resgateShowDone === "invalid" ? "Nenhum número inválido encontrado! 🙌" : "Todos já foram resgatados ou ninguém faltou! 🥳"}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* ===== Tab: Reforço (Agradecimento) ===== */}
          {activeTab === "reforco" && (
            <div className="animate-fade-in space-y-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>✨ Mensagem de Reforço (Agradecimento)</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div className="card-elegant p-1.5" style={{ display: 'flex', gap: '0.4rem', marginBottom: 0, background: '#f8fafc', borderRadius: '1rem', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)' }}>
                    <button 
                      onClick={() => setReforcoShowDone("pending")} 
                      className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${reforcoShowDone === "pending" ? 'bg-indigo-600 text-white shadow-lg border-indigo-700 font-semibold' : 'hover:bg-white hover:shadow-sm border-transparent text-slate-600'}`}
                    >
                      Pendentes <span style={{ opacity: 0.8, fontSize: '0.7rem', background: reforcoShowDone === "pending" ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '1px 6px', borderRadius: '999px' }}>{attendees.filter(a => a.processedReforco === 0 || a.processedReforco === 5).length}</span>
                    </button>
                    <button 
                      onClick={() => setReforcoShowDone("done")} 
                      className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${reforcoShowDone === "done" ? 'bg-indigo-600 text-white shadow-lg border-indigo-700 font-semibold' : 'hover:bg-white hover:shadow-sm border-transparent text-slate-600'}`}
                    >
                      Processados <span style={{ opacity: 0.8, fontSize: '0.7rem', background: reforcoShowDone === "done" ? 'rgba(255,255,255,0.2)' : '#e2e8f0', padding: '1px 6px', borderRadius: '999px' }}>{attendees.filter(a => a.processedReforco === 1).length}</span>
                    </button>
                    <button 
                      onClick={() => setReforcoShowDone("invalid")} 
                      className={`text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${reforcoShowDone === "invalid" ? 'bg-amber-500 text-white shadow-lg border-amber-600 font-semibold' : 'hover:bg-white hover:shadow-sm border-transparent text-slate-600'}`}
                    >
                      ⚠️ Corrigir <span style={{ opacity: 0.8, fontSize: '0.7rem', background: reforcoShowDone === "invalid" ? 'rgba(255,255,255,0.2)' : '#fef3c7', padding: '1px 6px', borderRadius: '999px', color: reforcoShowDone === "invalid" ? 'white' : '#92400e' }}>{attendees.filter(a => a.processedReforco === 4).length}</span>
                    </button>
                  </div>
                  {reforcoShowDone === "done" && (
                    <button
                      onClick={async () => {
                        if (!confirm("Isso voltará TODOS os contatos para a lista de Pendentes (Reforço). Confirma?")) return;
                        const res = await fetch("/api/admin/participants", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ resetAllProcessed: "reforco" })
                        });
                        if (res.ok) { toast.success("Reforço resetado!"); fetchAttendees(); }
                        else toast.error("Erro ao resetar");
                      }}
                      className="btn-secondary text-xs"
                    >
                      Zerar Todos da Lista
                    </button>
                  )}
                  <button onClick={fetchAttendees} disabled={attendeesLoading} className="btn-secondary">
                    {attendeesLoading ? <Loader2 className="animate-spin" /> : "Atualizar"}
                  </button>
                </div>
              </div>

              <div className="card-elegant p-0 overflow-hidden">
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ textAlign: 'center', padding: '1rem', width: '140px' }}>Ações</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Nome</th>
                        {reforcoShowDone === "invalid" && (
                          <>
                            <th style={{ textAlign: 'left', padding: '1rem' }}>Telefone</th>
                            <th style={{ textAlign: 'center', padding: '1rem', width: '60px' }}>Ok</th>
                            <th style={{ textAlign: 'center', padding: '1rem', width: '140px' }}>Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const seenPhones = new Set();
                        const isInvalidPhone = (phone: string) => {
                          if (!phone) return true;
                          const p = phone.toLowerCase();
                          return p === "" || p.includes("---") || p.includes("nao") || p.includes("informado") || p.includes("errado") || p.replace(/\D/g, '').length < 8;
                        };

                        const filtered = attendees
                          .filter(p => {
                            if (reforcoShowDone === "done") return p.processedReforco !== 0 && p.processedReforco !== 4;
                            if (reforcoShowDone === "invalid") return p.processedReforco === 4 || (p.processedReforco === 0 && isInvalidPhone(p.phone));
                            
                            // Para Pendentes:
                            if (p.processedReforco !== 0 && p.processedReforco !== 5) return false;
                            if (isInvalidPhone(p.phone)) return false;
                            
                            // Unicidade
                            const raw = (p.phone || '').replace(/\D/g, '');
                            if (seenPhones.has(raw)) return false;
                            seenPhones.add(raw);
                            
                            return true;
                          });

                        return filtered
                          .map((p, index) => {
                            const displayNum = filtered.length - index;
                            const buildMessage = () => {
                              if (eventInfo.customMessage && eventInfo.customMessage.trim() !== "") {
                                let customMsg = eventInfo.customMessage;
                                customMsg = customMsg.replace(/{nome}/g, (p.name || '').split(' ')[0]);
                                customMsg = customMsg.replace(/{proximo}/g, eventInfo.location);
                                customMsg = customMsg.replace(/{premios}/g, eventInfo.prizesList);
                                customMsg = customMsg.replace(/{resumo}/g, eventInfo.prevSummary);
                                customMsg = customMsg.replace(/{desafio}/g, eventInfo.nextChallenge);
                                customMsg = customMsg.replace(/{pontos}/g, eventInfo.tonightPoints);
                                customMsg = customMsg.replace(/{local}/g, eventInfo.location);
                                return customMsg;
                              }
                              return `Somos do Projeto *${eventInfo.projectName}*! ✨\n\nOi *${(p.name || '').split(' ')[0]}*! Ficamos muito felizes com sua presença ontem! 😍\n\n📝 *Resumo:* ${eventInfo.prevSummary}\n\nLembre-se que você pode ganhar prêmios incríveis! 🎁\n\n*Prêmios como:*\n${eventInfo.prizesList}\n\n🎯 *O desafio de hoje é:*\n${eventInfo.nextChallenge}\n\n🏆 *Pontos hoje:*\n${eventInfo.tonightPoints}\n\n📍 *Nos encontramos em:*\n${eventInfo.location}\n\nTe esperamos lá para mais uma vitória! 🔥`;
                            };
                            const msg = buildMessage();
                            const rawPhone = (p.phone || '').replace(/\D/g, '');
                            const intlPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
                            const zapLink = `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;

                            const updateProcessed = async (val: number) => {
                              setAttendees(prev => prev.map(a => a.id === p.id ? { ...a, processedReforco: val } : a));
                              await fetch("/api/admin/participants", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ participantId: p.id, processedReforco: val })
                              });
                            };

                            const handleInvalid = () => {
                              updateProcessed(4);
                              toast.info("Movido para lista de correção");
                            };

                            const handleEnviado = () => {
                              updateProcessed(1);
                              toast.success("Marcado como enviado!");
                            };

                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
                                    <div
                                      onClick={async (e) => {
                                        e.preventDefault();
                                        // Abre a janela IMEDIATAMENTE antes do await para o browser não bloquear
                                        const newWin = window.open('', '_blank');
                                        
                                        const res = await fetch("/api/admin/participants", {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ participantId: p.id, lockReforco: true })
                                        });
                                        
                                        if (res.ok) {
                                          if (newWin) newWin.location.href = zapLink;
                                          fetchAttendees();
                                        } else {
                                          if (newWin) newWin.close();
                                          const data = await res.json();
                                          if (data.error === "locked") {
                                            toast.error("⚠️ Já tem alguém enviando para este contato! Escolha o próximo.");
                                            fetchAttendees();
                                          } else {
                                            toast.error("Erro ao travar contato");
                                          }
                                        }
                                      }}
                                      className="btn-primary"
                                      style={{ background: p.processedReforco === 5 ? '#94a3b8' : '#25D366', padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'inline-flex', gap: '0.4rem', width: '100%', justifyContent: 'center', cursor: 'pointer' }}>
                                      <Heart style={{ width: 14, height: 14, fill: 'white' }} /> {p.processedReforco === 5 ? 'Em Processo...' : 'Abrir Zap'}
                                    </div>
                                    {reforcoShowDone === "pending" && (
                                      <div style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                                        <button onClick={handleEnviado} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.4rem', flex: 1, color: '#16a34a', borderColor: '#16a34a' }}>
                                          Enviado
                                        </button>
                                        <button onClick={handleInvalid} className="btn-secondary" style={{ fontSize: '0.65rem', padding: '0.3rem 0.4rem', flex: 1, color: '#d97706', borderColor: '#d97706' }}>
                                          Não é Zap
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem' }}><span style={{ color: 'var(--muted-foreground)', marginRight: '0.4rem', fontSize: '0.8rem' }}>{displayNum}.</span>{p.name}</td>
                                {reforcoShowDone === "invalid" && (
                                  <>
                                    <td style={{ padding: '1rem', color: p.phone ? 'inherit' : '#dc2626', fontStyle: p.phone ? 'normal' : 'italic' }}>{p.phone || '⚠ sem telefone'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                      <input type="checkbox" checked={p.processedReforco !== 0}
                                        onChange={(e) => updateProcessed(e.target.checked ? 1 : 0)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                      <select
                                        value={p.processedReforco}
                                        onChange={(e) => updateProcessed(Number(e.target.value))}
                                        style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.75rem', background: p.processedReforco === 1 ? '#dcfce7' : p.processedReforco === 3 ? '#e0e7ff' : p.processedReforco === 2 ? '#fee2e2' : p.processedReforco === 4 ? '#ffedd5' : p.processedReforco === 5 ? '#fef9c3' : '#f3f4f6', cursor: 'pointer', outline: 'none' }}
                                      >
                                        <option value={0}>⏳ Pendente</option>
                                        <option value={1}>✅ Enviado</option>
                                        <option value={5}>🔄 Em Processo</option>
                                        <option value={3}>💬 Respondeu</option>
                                        <option value={4}>🚫 Não é Zap</option>
                                        <option value={2}>❌ Falhou</option>
                                      </select>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          });
                      })()}
                      {attendees.filter(p => {
                        const isInvalid = (phone: string) => {
                          if (!phone) return true;
                          const ph = phone.toLowerCase();
                          return ph === "" || ph.includes("---") || ph.includes("nao") || ph.includes("informado") || ph.includes("errado") || ph.replace(/\D/g, '').length < 8;
                        };
                        if (reforcoShowDone === "done") return p.processedReforco !== 0 && p.processedReforco !== 4;
                        if (reforcoShowDone === "invalid") return p.processedReforco === 4 || (p.processedReforco === 0 && isInvalid(p.phone));
                        return p.processedReforco === 0 && !isInvalid(p.phone);
                      }).length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>{reforcoShowDone === "done" ? "Nenhum contato processado ainda." : reforcoShowDone === "invalid" ? "Nenhum número inválido encontrado! 🙌" : "Lista limpa! Todos os presentes já receberam o bônus de incentivo. 🤩"}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== Tab: Presença ===== */}
          {activeTab === "presenca" && (
            <div className="animate-fade-in space-y-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>📍 Controle de Presença Detalhado</h2>
                <div style={{ display: 'flex', gap: '0.75rem', flex: '1', maxWidth: '400px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou cartão..."
                      value={presenceSearch}
                      onChange={(e) => setPresenceSearch(e.target.value)}
                      className="input-elegant"
                      style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <button onClick={fetchParticipants} className="btn-secondary">Atualizar</button>
                </div>
              </div>

              <div className="card-elegant p-0 overflow-hidden">
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Participante</th>
                        <th style={{ textAlign: 'left', padding: '1rem' }}>Cartão</th>
                        <th style={{ textAlign: 'center', padding: '1rem' }}>Presenças Totais</th>
                        <th style={{ textAlign: 'center', padding: '1rem' }}>Dias de Presença Manual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants
                        .filter(p =>
                          p.name.toLowerCase().includes(presenceSearch.toLowerCase()) ||
                          (p.cardNumber || '').includes(presenceSearch)
                        )
                        .map((p) => {
                          const userAttendances = allAttendance.filter((a) => a.participantId === p.id);

                          const noites = [
                            { id: 1, label: "28/03", desc: "Presença Manual Noite 1", date: new Date(new Date().getFullYear(), 2, 28, 20, 0, 0).toISOString() },
                            { id: 2, label: "29/03", desc: "Presença Manual Noite 2", date: new Date(new Date().getFullYear(), 2, 29, 20, 0, 0).toISOString() },
                            { id: 3, label: "30/03", desc: "Presença Manual Noite 3", date: new Date(new Date().getFullYear(), 2, 30, 20, 0, 0).toISOString() },
                            { id: 4, label: "31/03", desc: "Presença Manual Noite 4", date: new Date(new Date().getFullYear(), 2, 31, 20, 0, 0).toISOString() },
                            { id: 5, label: "01/04", desc: "Presença Manual Noite 5", date: new Date(new Date().getFullYear(), 3, 1, 20, 0, 0).toISOString() }
                          ];

                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{p.email}</div>
                              </td>
                              <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{p.cardNumber || '---'}</td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '0.2rem 0.8rem', borderRadius: '1rem' }}>
                                  {userAttendances.length}
                                </span>
                              </td>
                              <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => setAttendanceModalUser(p)}
                                  className="btn-primary"
                                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                >
                                  <Calendar style={{ width: 14, height: 14, marginRight: '0.4rem', display: 'inline' }} />
                                  Abrir Calendário
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Modal: Gerenciar Presenças ===== */}
      {attendanceModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-elegant animate-fade-in" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Calendário - {attendanceModalUser.name.split(' ')[0]}</h3>
              <button onClick={() => setAttendanceModalUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X style={{ width: 18, height: 18 }} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <input type="date" value={newAttendanceDate} onChange={(e) => setNewAttendanceDate(e.target.value)} className="input-elegant" style={{ flex: 1, padding: '0.5rem 1rem' }} />
              <button className="btn-primary" onClick={async () => {
                if (!newAttendanceDate) { toast.error("Escolha uma data"); return; }
                
                // Quebra a string "YYYY-MM-DD" para evitar dezenas de bugs de timezone UTC
                const [year, month, day] = newAttendanceDate.split('-').map(Number);
                const d = new Date(year, month - 1, day, 20, 0, 0); // Sempre no horário local às 20h
                
                const res = await fetch("/api/volunteer/attendance", {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId: attendanceModalUser.id, date: d.toISOString(), addPoints: false, description: "Presença Manual (Calendário)" })
                });
                if (res.ok) { toast.success("Presença adicionada!"); fetchAllAttendance(); setNewAttendanceDate(""); }
                else toast.error("Erro ou presença já registrada!");
              }}>Adicionar Dia</button>
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Data / Hora</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Motivo</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '50px' }}>Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttendance.filter(a => a.participantId === attendanceModalUser.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{new Date(a.date).toLocaleDateString('pt-BR')} <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', fontWeight: 400 }}>{new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></td>
                      <td style={{ padding: '0.75rem', color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>{a.description || 'Check-in QR'}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteAttendance(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                      </td>
                    </tr>
                  ))}
                  {allAttendance.filter(a => a.participantId === attendanceModalUser.id).length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Nenhuma presença registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {printModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="card-elegant animate-fade-in" style={{ padding: '1.5rem', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer style={{ width: 18, height: 18, color: '#f59e0b' }}/> 
              Impressão em Lote
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              Deixe em branco para imprimir TODOS disponíveis na lista, ou defina a faixa exata (Ex: Inicial 1, Final 50).
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Nº Inicial</label>
                <input type="number" placeholder="Ex: 1" value={printStart} onChange={e => setPrintStart(e.target.value)} className="input-elegant" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Nº Final</label>
                <input type="number" placeholder="Ex: 50" value={printEnd} onChange={e => setPrintEnd(e.target.value)} className="input-elegant" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setPrintModal({ type: null, isOpen: false })}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleConfirmPrintRange}>
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Trocar Cartão */}
      {transferParticipant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="card-elegant animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <RefreshCw style={{ width: 24, height: 24, color: '#d97706' }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Trocar Cartão</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Isso vinculará um <strong>novo QR Code</strong> para <strong>{transferParticipant.name}</strong>. 
              O saldo de pontos e histórico serão preservados intactos.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label-elegant">Escolha o Novo Cartão Extra</label>
              <select 
                  value={newCardIdForTransfer} 
                  onChange={e => {
                      const val = e.target.value;
                      setNewCardIdForTransfer(val);
                      const selected = unassignedCards.find(c => c.cardId === val);
                      if (selected) {
                        setNewCardNumberForTransfer(selected.cardNumber || "");
                      }
                  }}
                  className="input-elegant"
                  style={{ cursor: 'pointer' }}
              >
                <option value="">Selecione um cartão disponível...</option>
                {unassignedCards.length === 0 ? (
                  <option disabled>Nenhum cartão extra disponível. Gere um lote na aba Cartões.</option>
                ) : (
                  unassignedCards.map(c => (
                    <option key={c.id} value={c.cardId}>
                      Cartão {c.cardNumber || 'Sem nº'} — (ID: {c.cardId.slice(-6)})
                    </option>
                  ))
                )}
              </select>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                O cartão antigo ({transferParticipant.cardNumber || '...'}) deixará de funcionar.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                  onClick={handleTransferCard}
                  disabled={transferLoading || !newCardIdForTransfer}
                  className="btn-primary" 
                  style={{ flex: 2, padding: '0.75rem', background: '#f59e0b', borderColor: '#d97706', opacity: (!newCardIdForTransfer || transferLoading) ? 0.6 : 1 }}
              >
                {transferLoading ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : 'Confirmar Troca'}
              </button>
              <button 
                  onClick={() => {
                      setTransferParticipant(null);
                      setNewCardIdForTransfer("");
                      setNewCardNumberForTransfer("");
                  }}
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '0.75rem' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
