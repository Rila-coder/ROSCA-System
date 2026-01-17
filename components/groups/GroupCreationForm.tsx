"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Users,
  Calendar,
  DollarSign,
  Clock,
  HelpCircle,
  ChevronRight,
  Save,
  X,
  AlertTriangle,
  Loader2,
  Crown,
  Trash2,
  Plus,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  User,
  Sparkles,
  Copy,
  Mail,
  Phone,
  Key,
  Star,
  Check,
  RefreshCw,
  LogIn,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";

type FrequencyType = "daily" | "weekly" | "monthly";
type NumberAssignmentMethod = "random" | "manual";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  isLeader?: boolean;
  role?: "leader" | "member";
  isRegistered?: boolean;
  isCreator?: boolean;
}

interface SavedMember {
  name: string;
  email: string;
  phone: string;
}

interface ValidationError {
  email?: string;
  phone?: string;
}

interface GroupCreationFormProps {
  onStepChange?: (step: number) => void;
}

export default function GroupCreationForm({ onStepChange }: GroupCreationFormProps) {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedMembers, setSavedMembers] = useState<SavedMember[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, ValidationError>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Phone Number Modal State
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [missingPhoneInput, setMissingPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contributionAmount: "",
    frequency: "monthly" as FrequencyType,
    targetMemberCount: "",
    startDate: "",
    bankAccount: {
      bankName: "",
      accountNumber: "",
      accountHolder: "",
    },
  });

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [isCheckingLeader, setIsCheckingLeader] = useState(false);
  const [showSavedMembers, setShowSavedMembers] = useState(false);
  const [includeCreator, setIncludeCreator] = useState(false);

  // Number assignment state
  const [numberAssignmentMethod, setNumberAssignmentMethod] =
    useState<NumberAssignmentMethod>("random");
  const [assignedNumbers, setAssignedNumbers] = useState<
    Record<string, number>
  >({});
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([]);

  // Notify parent component about step change
  const updateStep = (newStep: number) => {
    setStep(newStep);
    if (onStepChange) {
      onStepChange(newStep);
    }
  };

  // ✅ FIX: Force refresh user data on mount to catch recent profile updates
  useEffect(() => {
    const initData = async () => {
      if (refreshUser) {
        await refreshUser();
      }
    };
    initData();
  }, []); // Empty dependency array means this runs once when page loads

  // Initialize with creator info if user exists
  useEffect(() => {
    if (user && includeCreator) {
      const creatorEmail = user.email || "";
      const creatorName = user.name || "You";

      // Check if creator is already in members list (more thorough check)
      const isCreatorAlreadyAdded = members.some(
        (m) =>
          (m.email.toLowerCase() === creatorEmail.toLowerCase() && creatorEmail) ||
          m.isCreator
      );

      if (!isCreatorAlreadyAdded && creatorEmail) {
        const creatorId = `creator-${Date.now()}`;
        const creatorMember: Member = {
          id: creatorId,
          name: creatorName,
          email: creatorEmail,
          phone: user.phone || "",
          isCreator: true,
          isLeader: false,
          isRegistered: true,
        };

        setMembers((prev) => [...prev, creatorMember]);
        toast.success("You have been added to the group!");
      } else if (creatorEmail) {
        // Creator is already added, just update the flag
        setIncludeCreator(true);
      }
    }
  }, [includeCreator, user, members]);

  // Update available numbers when members change
  useEffect(() => {
    const totalMembers = members.length;
    const allNumbers = Array.from({ length: totalMembers }, (_, i) => i + 1);
    const usedNumbers = Object.values(assignedNumbers);
    const available = allNumbers.filter(num => !usedNumbers.includes(num));
    setAvailableNumbers(available);
  }, [members, assignedNumbers]);

  // Helper: Get dynamic duration
  const getDuration = () => {
    return parseInt(formData.targetMemberCount) || members.length || 0;
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Group name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Group name must be at least 3 characters";
    }

    if (
      !formData.contributionAmount ||
      parseFloat(formData.contributionAmount) <= 0
    ) {
      newErrors.contributionAmount = "Valid contribution amount is required";
    }

    // Validate target member count
    const count = parseInt(formData.targetMemberCount);
    if (!count || count < 2) {
      newErrors.targetMemberCount = "At least 2 members are required";
    } else if (count > 50) {
      newErrors.targetMemberCount = "Maximum 50 members allowed";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else {
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        newErrors.startDate = "Start date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = async () => {
    const requiredCount = parseInt(formData.targetMemberCount);

    // Check exact member count
    if (members.length !== requiredCount) {
      toast.error(
        `You specified ${requiredCount} members, but added ${members.length}. Please add exactly ${requiredCount} members.`
      );
      return false;
    }

    // Check if leader is selected
    if (!selectedLeaderId) {
      toast.error("Please select a group leader from the members list");
      return false;
    }

    return true;
  };

  const handleNextStep = async () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      const isValid = await validateStep2();
      if (!isValid) return;
      // Auto-assign random numbers
      if (numberAssignmentMethod === "random") {
        handleRandomizeNumbers();
      }
    }
    if (step === 3) {
      // Validate that all members have numbers
      if (Object.keys(assignedNumbers).length !== members.length) {
        toast.error("Please assign numbers to all members");
        return;
      }
    }
    if (step === 4 && !acceptTerms) {
      toast.error("You must accept the Terms and Conditions to create the group");
      return;
    }
    
    const nextStep = step + 1;
    updateStep(nextStep);
  };

  const handlePreviousStep = () => {
    const prevStep = step - 1;
    updateStep(prevStep);
  };

  // Validate individual member
  const validateMember = (member: Partial<Member>) => {
    const errors: ValidationError = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (member.email && !emailRegex.test(member.email)) {
      errors.email = "Invalid email format";
    }

    // Phone validation
    if (member.phone) {
      const phoneDigits = member.phone.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        errors.phone = "Phone must have at least 10 digits";
      }
    }

    return errors;
  };

  // Check for duplicate email/phone
  const checkForDuplicates = (
    email: string,
    phone: string,
    excludeId?: string
  ) => {
    const emailLower = email.toLowerCase();
    const phoneDigits = phone.replace(/\D/g, "");

    const duplicates = members.filter((m) => {
      if (excludeId && m.id === excludeId) return false;

      const memberEmail = m.email.toLowerCase();
      const memberPhone = m.phone.replace(/\D/g, "");

      return memberEmail === emailLower || memberPhone === phoneDigits;
    });

    return duplicates;
  };

  // Member Management Functions
  const addMember = () => {
    const { name, email, phone } = newMember;

    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill all fields for the member");
      return;
    }

    // Validate member
    const validationErrors = validateMember({ email, phone });
    if (Object.keys(validationErrors).length > 0) {
      Object.values(validationErrors).forEach((error) => {
        toast.error(error);
      });
      return;
    }

    // Check for duplicates
    const duplicates = checkForDuplicates(email, phone);
    if (duplicates.length > 0) {
      const duplicateNames = duplicates.map((d) => d.name).join(", ");
      toast.error(
        `Duplicate found with: ${duplicateNames}. Email or phone already exists.`
      );
      return;
    }

    // Check limit
    const limit = parseInt(formData.targetMemberCount) || 0;
    if (limit > 0 && members.length >= limit) {
      toast.error(`Maximum ${limit} members allowed`);
      return;
    }

    // Check if member is registered
    const checkRegistration = async () => {
      try {
        const response = await fetch("/api/users/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase() }),
        });

        const data = await response.json();
        const isRegistered = data.exists || false;

        const memberId = `member-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const newMemberObj: Member = {
          id: memberId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          isLeader: false,
          isRegistered,
        };

        setMembers((prev) => [...prev, newMemberObj]);
        setNewMember({ name: "", email: "", phone: "" });

        // Save to recently used members
        const savedMember: SavedMember = {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
        };
        setSavedMembers((prev) => {
          const existingIndex = prev.findIndex(
            (m) => m.email.toLowerCase() === savedMember.email.toLowerCase()
          );
          if (existingIndex >= 0) {
            prev[existingIndex] = savedMember;
            return [...prev];
          }
          return [savedMember, ...prev.slice(0, 9)];
        });

        toast.success(
          `Member ${name} added successfully${
            isRegistered ? " (Registered)" : " (Not Registered)"
          }`
        );
      } catch (error) {
        toast.error("Failed to check member registration");
      }
    };

    checkRegistration();
  };

  const removeMember = (id: string) => {
    const member = members.find((m) => m.id === id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
    
    // Remove assigned number if exists
    if (assignedNumbers[id]) {
      const newAssignedNumbers = { ...assignedNumbers };
      delete newAssignedNumbers[id];
      setAssignedNumbers(newAssignedNumbers);
    }
    
    if (selectedLeaderId === id) {
      setSelectedLeaderId("");
    }
    if (member?.isCreator) {
      setIncludeCreator(false);
    }
  };

  const setLeader = async (id: string) => {
    const member = members.find((m) => m.id === id);
    if (!member) {
      toast.error("Member not found");
      return;
    }

    // If member is the creator, they are always registered
    if (member.isCreator) {
      setSelectedLeaderId(id);
      toast.success(`${member.name} is now the group leader!`);
      return;
    }

    setIsCheckingLeader(true);

    try {
      const response = await fetch("/api/users/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email }),
      });

      const data = await response.json();

      if (!data.exists) {
        toast.error(
          `${member.name} is not registered. The leader must have an account.`
        );
        setIsCheckingLeader(false);
        return;
      }

      setSelectedLeaderId(id);
      toast.success(`${member.name} is now the group leader!`);
    } catch (error) {
      toast.error("Failed to verify leader account");
    } finally {
      setIsCheckingLeader(false);
    }
  };

  // Handle "Add Me" Click - Logic to check phone number
  const handleAddCreator = () => {
    if (!user) {
      toast.error("You must be logged in to add yourself");
      return;
    }

    // 1. Check if user already has a phone number
    if (!user.phone) {
      // Open modal to ask for phone number
      setIsPhoneModalOpen(true);
      return;
    }

    // 2. Standard adding logic if phone exists
    proceedToAddCreator();
  };

  // Logic to save the phone number from the modal
  const handleSaveMissingPhone = async () => {
    if (!missingPhoneInput.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(missingPhoneInput)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSavingPhone(true);
    try {
      // Send avatar as empty string ('') to preserve existing Google image
      const updateData = {
        name: user?.name,
        phone: missingPhoneInput.trim(),
        avatar: '' // Empty string tells backend "Don't change this"
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        throw new Error("Failed to save phone number");
      }

      // Success: Refresh the Auth Session so the user object updates globally
      await refreshUser();
      
      toast.success("Phone number saved! Adding you to group...");
      
      // Close modal and proceed to add to group
      setIsPhoneModalOpen(false);
      proceedToAddCreator();

    } catch (error) {
      console.error(error);
      toast.error("Failed to save phone number. Please try again.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Shared function to actually add the user object to the list
  const proceedToAddCreator = () => {
    // Re-check user (if called after refresh, user object is updated)
    const currentPhone = user?.phone || missingPhoneInput || ""; 

    const creatorEmail = user?.email || "";
    const creatorName = user?.name || "You";

    // Check if creator is already added
    const isAlreadyAdded = members.some(member => 
      (member.email && creatorEmail && member.email.toLowerCase() === creatorEmail.toLowerCase()) || 
      member.isCreator
    );

    if (isAlreadyAdded) {
      toast("You are already in the group");
      return;
    }

    // Check limit
    const limit = parseInt(formData.targetMemberCount) || 0;
    if (limit > 0 && members.length >= limit) {
      toast.error(`Maximum ${limit} members allowed`);
      return;
    }

    const creatorId = `creator-${Date.now()}`;
    const creatorMember: Member = {
      id: creatorId,
      name: creatorName,
      email: creatorEmail,
      phone: currentPhone, // Use the fresh phone number
      isCreator: true,
      isLeader: false,
      isRegistered: true,
    };

    setMembers((prev) => [...prev, creatorMember]);
    setIncludeCreator(true);
  };

  const handleImportFromLastAdded = () => {
    if (savedMembers.length === 0) {
      toast.error("No recently added members found");
      return;
    }

    const limit = parseInt(formData.targetMemberCount) || 0;
    const availableSlots = limit - members.length;

    if (availableSlots <= 0) {
      toast.error(`Maximum ${limit} members already added`);
      return;
    }

    const membersToAdd = savedMembers.slice(
      0,
      Math.min(availableSlots, savedMembers.length)
    );
    let addedCount = 0;

    membersToAdd.forEach((savedMember) => {
      if (
        members.some(
          (m) => m.email.toLowerCase() === savedMember.email.toLowerCase()
        )
      ) {
        return;
      }

      const batchDuplicates = membersToAdd.filter(
        (m, idx) =>
          idx < addedCount &&
          (m.email.toLowerCase() === savedMember.email.toLowerCase() ||
            m.phone.replace(/\D/g, "") === savedMember.phone.replace(/\D/g, ""))
      );

      if (batchDuplicates.length > 0) {
        return;
      }

      const memberId = `member-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newMemberObj: Member = {
        id: memberId,
        name: savedMember.name,
        email: savedMember.email,
        phone: savedMember.phone,
        isLeader: false,
      };

      setMembers((prev) => [...prev, newMemberObj]);
      addedCount++;
    });

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} members from recently added`);
    } else {
      toast(
        "All recently added members are already in the list or have duplicates"
      );
    }
  };

  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split("\n").filter((line) => line.trim());
        const importedMembers: Member[] = [];

        let startIndex = 0;
        if (
          lines[0].toLowerCase().includes("name") ||
          lines[0].toLowerCase().includes("email")
        ) {
          startIndex = 1;
        }

        const importedEmails = new Set<string>();
        const importedPhones = new Set<string>();

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.trim());
          if (parts.length >= 3) {
            const email = parts[1].toLowerCase();
            const phone = parts[2].replace(/\D/g, "");

            if (importedEmails.has(email) || importedPhones.has(phone)) {
              toast.error(
                `Duplicate found in CSV at line ${i + 1}: ${parts[0]}`
              );
              continue;
            }

            importedEmails.add(email);
            importedPhones.add(phone);

            const memberId = `imported-${Date.now()}-${i}`;

            let isRegistered = false;
            try {
              const response = await fetch("/api/users/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
              const data = await response.json();
              isRegistered = data.exists || false;
            } catch (error) {
              console.error("Failed to check registration for:", email);
            }

            importedMembers.push({
              id: memberId,
              name: parts[0],
              email: email,
              phone: parts[2],
              isLeader: false,
              isRegistered,
            });
          }
        }

        if (importedMembers.length > 0) {
          const limit = parseInt(formData.targetMemberCount) || 0;
          const availableSlots = limit - members.length;

          if (availableSlots <= 0) {
            toast.error(`Maximum ${limit} members already added`);
            return;
          }

          const membersToAdd = importedMembers.slice(
            0,
            Math.min(availableSlots, importedMembers.length)
          );

          const filteredMembers = membersToAdd.filter(
            (newMember) =>
              !members.some(
                (existing) =>
                  existing.email.toLowerCase() ===
                    newMember.email.toLowerCase() ||
                  existing.phone.replace(/\D/g, "") ===
                    newMember.phone.replace(/\D/g, "")
              )
          );

          if (filteredMembers.length > 0) {
            setMembers((prev) => [...prev, ...filteredMembers]);

            const newSavedMembers: SavedMember[] = filteredMembers.map((m) => ({
              name: m.name,
              email: m.email,
              phone: m.phone,
            }));

            setSavedMembers((prev) => {
              const updated = [...prev];
              newSavedMembers.forEach((newMember) => {
                const existingIndex = updated.findIndex(
                  (m) => m.email.toLowerCase() === newMember.email.toLowerCase()
                );
                if (existingIndex >= 0) {
                  updated[existingIndex] = newMember;
                } else {
                  updated.unshift(newMember);
                }
              });
              return updated.slice(0, 10);
            });

            const registeredCount = filteredMembers.filter(
              (m) => m.isRegistered
            ).length;
            toast.success(
              `Imported ${filteredMembers.length} members from CSV (${registeredCount} registered)`
            );
          } else {
            toast.error(
              "All imported members are already in the list or have duplicates"
            );
          }
        }
      } catch (error) {
        toast.error(
          "Failed to parse CSV file. Please check format: Name,Email,Phone"
        );
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  const exportMembersToCSV = () => {
    if (members.length === 0) {
      toast.error("No members to export");
      return;
    }

    const csvContent = [
      "Name,Email,Phone,Role,Registered",
      ...members.map(
        (m) =>
          `${m.name},${m.email},${m.phone},${
            m.isLeader ? "Leader" : "Member"
          },${m.isRegistered ? "Yes" : "No"}`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `group-members-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${members.length} members to CSV`);
  };

  const handleRandomizeNumbers = () => {
    const shuffled = [...members].sort(() => 0.5 - Math.random());
    const assignments: Record<string, number> = {};
    shuffled.forEach((member, index) => {
      assignments[member.id] = index + 1;
    });
    setAssignedNumbers(assignments);
    toast.success("Random numbers assigned!");
  };

  const handleManualNumberChange = (memberId: string, numberStr: string) => {
    const num = parseInt(numberStr);
    if (!num) {
      const newAssignments = { ...assignedNumbers };
      delete newAssignments[memberId];
      setAssignedNumbers(newAssignments);
      return;
    }

    if (isNaN(num) || num < 1 || num > members.length) {
      toast.error(`Number must be between 1 and ${members.length}`);
      return;
    }

    const existingMemberId = Object.keys(assignedNumbers).find(
      (id) => id !== memberId && assignedNumbers[id] === num
    );

    if (existingMemberId) {
      const existingMember = members.find((m) => m.id === existingMemberId);
      toast.error(
        `Number ${num} is already assigned to ${existingMember?.name}`
      );
      return;
    }

    setAssignedNumbers((prev) => ({
      ...prev,
      [memberId]: num,
    }));
  };

  const getAvailableNumbersForMember = (memberId: string) => {
    const totalNumbers = Array.from({ length: members.length }, (_, i) => i + 1);
    const usedNumbers = Object.entries(assignedNumbers)
      .filter(([id]) => id !== memberId)
      .map(([_, num]) => num);
    
    return totalNumbers.filter(num => !usedNumbers.includes(num));
  };

  const handleSubmit = async () => {
    if (!acceptTerms) {
      toast.error("You must accept the Terms and Conditions to create the group");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Creating group...", { id: "create-group" });

      const leader = members.find((m) => m.id === selectedLeaderId);

      const groupData = {
        name: formData.name,
        description: formData.description,
        contributionAmount: parseFloat(formData.contributionAmount),
        frequency: formData.frequency,
        targetMemberCount: members.length,
        duration: members.length,
        startDate: formData.startDate,
        bankAccount: formData.bankAccount.bankName
          ? formData.bankAccount
          : null,
        leaderEmail: leader?.email,
        members: members.map((member) => ({
          name: member.name,
          email: member.email.toLowerCase().trim(),
          phone: member.phone.trim(),
          drawNumber: assignedNumbers[member.id] || null,
          role: member.id === selectedLeaderId ? "leader" : "member",
          isCreator: member.isCreator || false,
        })),
      };

      console.log("Submitting group data:", groupData); 

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupData),
        credentials: "include",
      });

      const data = await response.json();
      toast.dismiss("create-group");

      if (!response.ok) {
        console.error("Backend error:", data);
        throw new Error(data.message || data.error || "Failed to create group");
      }

      toast.success("Group created successfully!");
      router.push(`/groups/${data.group._id}`);
    } catch (error: any) {
      toast.dismiss("create-group");
      toast.error(error.message || "Something went wrong");
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name.startsWith("bankAccount.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        bankAccount: {
          ...prev.bankAccount,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Group Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`input-field w-full ${
                  errors.name ? "border-error focus:border-error" : ""
                }`}
                placeholder="e.g., Family Savings, Office ROSCA"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-error">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input-field w-full min-h-25 resize-none"
                placeholder="What is this group for? Any special rules?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Contribution Amount *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={18} className="text-text/40" />
                  </div>
                  <input
                    type="number"
                    name="contributionAmount"
                    value={formData.contributionAmount}
                    onChange={handleInputChange}
                    className={`input-field w-full pl-10 ${
                      errors.contributionAmount
                        ? "border-error focus:border-error"
                        : ""
                    }`}
                    placeholder="2000"
                    min="1"
                    required
                  />
                </div>
                {errors.contributionAmount && (
                  <p className="mt-1 text-sm text-error">
                    {errors.contributionAmount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Frequency *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock size={18} className="text-text/40" />
                  </div>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="input-field w-full pl-10"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-text mb-2">
                  Total Members (Cycles) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users size={18} className="text-text/40" />
                  </div>
                  <input
                    type="number"
                    name="targetMemberCount"
                    value={formData.targetMemberCount}
                    onChange={handleInputChange}
                    className={`input-field w-full pl-10 ${
                      errors.targetMemberCount
                        ? "border-error focus:border-error"
                        : ""
                    }`}
                    placeholder="5"
                    min="2"
                    max="50"
                    required
                  />
                </div>
                {errors.targetMemberCount && (
                  <p className="mt-1 text-sm text-error">
                    {errors.targetMemberCount}
                  </p>
                )}
                <p className="text-xs text-text/60 mt-1">
                  Duration will be {formData.targetMemberCount || 0} cycles (one
                  per member)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className={`input-field w-full ${
                  errors.startDate ? "border-error focus:border-error" : ""
                }`}
                required
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-error">{errors.startDate}</p>
              )}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-medium text-text mb-3 text-sm sm:text-base">
                Group Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text/60">Total Members:</span>
                  <span className="font-medium">
                    {formData.targetMemberCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">Duration (Cycles):</span>
                  <span className="font-medium">
                    {formData.targetMemberCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">Collection per Cycle:</span>
                  <span className="font-medium">
                    ₹
                    {(parseFloat(formData.contributionAmount) || 0) *
                      (parseInt(formData.targetMemberCount) || 0)}
                    <span className="text-text/60 text-xs ml-1">
                      ({formData.frequency})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">Total Group Value:</span>
                  <span className="font-bold text-primary">
                    ₹
                    {(
                      (parseFloat(formData.contributionAmount) || 0) *
                      (parseInt(formData.targetMemberCount) || 0) *
                      (parseInt(formData.targetMemberCount) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-text text-sm sm:text-base">
                  Bank Account (Optional)
                </h3>
                <HelpCircle size={16} className="text-text/40" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm text-text/70 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankAccount.bankName"
                    value={formData.bankAccount.bankName}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    placeholder="e.g., State Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text/70 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="bankAccount.accountNumber"
                    value={formData.bankAccount.accountNumber}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    placeholder="1234567890"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-text/70 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    name="bankAccount.accountHolder"
                    value={formData.bankAccount.accountHolder}
                    onChange={handleInputChange}
                    className="input-field w-full"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-4 rounded-lg gap-2">
              <div>
                <h3 className="font-medium text-text">Add Members</h3>
                <p className="text-sm text-text/60 mt-1">
                  Add exactly {formData.targetMemberCount} members. Each member
                  will represent one cycle.
                </p>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                <div
                  className={`text-lg font-bold ${
                    members.length === parseInt(formData.targetMemberCount)
                      ? "text-green-600"
                      : "text-primary"
                  }`}
                >
                  {members.length} / {formData.targetMemberCount}
                </div>
                <div className="text-xs text-text/60">Members Added</div>
              </div>
            </div>

            {user &&
              !includeCreator && (
                <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <UserPlus size={20} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-text">
                          Include Yourself
                        </div>
                        <div className="text-sm text-text/60">
                          Add yourself as a member of this group
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleAddCreator}
                      className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <LogIn size={16} />
                      Add Me
                    </button>
                  </div>
                </div>
              )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={handleImportFromLastAdded}
                className="flex flex-col items-center justify-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors group"
              >
                <Sparkles
                  size={20}
                  className="text-primary mb-2 group-hover:scale-110 transition-transform"
                />
                <span className="text-sm font-medium text-text text-center">
                  Last Added
                </span>
                <span className="text-[10px] sm:text-xs text-text/60 mt-1">
                  {savedMembers.length} saved
                </span>
              </button>

              <button
                onClick={handleImportCSV}
                className="flex flex-col items-center justify-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors group"
              >
                <Upload
                  size={20}
                  className="text-primary mb-2 group-hover:scale-110 transition-transform"
                />
                <span className="text-sm font-medium text-text text-center">
                  Import CSV
                </span>
                <span className="text-[10px] sm:text-xs text-text/60 mt-1">
                  Name,Email,Phone
                </span>
              </button>

              <button
                onClick={exportMembersToCSV}
                disabled={members.length === 0}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 border rounded-lg transition-colors group ${
                  members.length === 0
                    ? "border-gray-100 bg-gray-50 cursor-not-allowed"
                    : "border-gray-200 hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <Download
                  size={20}
                  className={`mb-2 group-hover:scale-110 transition-transform ${
                    members.length === 0 ? "text-gray-300" : "text-primary"
                  }`}
                />
                <span
                  className={`text-sm font-medium text-center ${
                    members.length === 0 ? "text-gray-400" : "text-text"
                  }`}
                >
                  Export CSV
                </span>
                <span className="text-[10px] sm:text-xs text-text/60 mt-1">
                  {members.length} members
                </span>
              </button>

              <button
                onClick={() => setShowSavedMembers(!showSavedMembers)}
                className="flex flex-col items-center justify-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors group"
              >
                <Users
                  size={20}
                  className="text-primary mb-2 group-hover:scale-110 transition-transform"
                />
                <span className="text-sm font-medium text-text text-center">Saved</span>
                <span className="text-[10px] sm:text-xs text-text/60 mt-1">View all</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />

            {showSavedMembers && savedMembers.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-text">
                    Recently Added Members
                  </h4>
                  <button
                    onClick={() => setShowSavedMembers(false)}
                    className="text-text/40 hover:text-text/60"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {savedMembers.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-text/60">
                          {member.email}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewMember({
                            name: member.name,
                            email: member.email,
                            phone: member.phone,
                          });
                          setShowSavedMembers(false);
                        }}
                        className="text-primary hover:text-primary-dark text-sm"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-text mb-3">Add New Member</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  className="input-field"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  className="input-field"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <button
                onClick={addMember}
                disabled={
                  members.length >= parseInt(formData.targetMemberCount)
                }
                className="mt-4 w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Member
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-text">Members List</h4>
              {members.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                  <Users size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-text/60">No members added yet</p>
                  <p className="text-sm text-text/40 mt-1">
                    Add members using the form above or include yourself
                  </p>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className={`border rounded-lg p-3 sm:p-4 transition-all ${
                      selectedLeaderId === member.id
                        ? "border-yellow-400 bg-yellow-50"
                        : member.isCreator
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            selectedLeaderId === member.id
                              ? "bg-yellow-100 text-yellow-600"
                              : member.isCreator
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {selectedLeaderId === member.id ? (
                            <Crown size={18} />
                          ) : member.isCreator ? (
                            <UserPlus size={18} />
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            <span className="truncate">{member.name}</span>
                            {member.isCreator && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full shrink-0">
                                <UserPlus size={10} />
                                You
                              </span>
                            )}
                            {selectedLeaderId === member.id && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full shrink-0">
                                <Crown size={10} />
                                Leader
                              </span>
                            )}
                            {member.isRegistered &&
                              !member.isCreator &&
                              !selectedLeaderId && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full shrink-0">
                                  <Check size={10} />
                                  Reg
                                </span>
                              )}
                          </div>
                          <div className="text-sm text-text/60 flex flex-wrap items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone size={12} className="shrink-0" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 w-full sm:w-auto">
                        {/* Allow creator to be made leader */}
                        {selectedLeaderId !== member.id && (
                          <button
                            onClick={() => setLeader(member.id)}
                            disabled={isCheckingLeader}
                            className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                          >
                            {isCheckingLeader &&
                            selectedLeaderId === member.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Crown size={14} />
                            )}
                            Make Leader
                          </button>
                        )}
                        {/* ✅ FIX: Allowed creator to be removed (removed the !member.isCreator condition) */}
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {selectedLeaderId === member.id && (
                      <div className="mt-3 pt-3 border-t border-yellow-200">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle size={16} className="text-green-500" />
                          <span className="text-green-600 font-medium">
                            This member will be the group leader
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Leader Confirmation */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Crown className="text-yellow-600" size={20} />
                <div>
                  <h4 className="font-medium text-yellow-800">
                    Selected Leader
                  </h4>
                  {selectedLeaderId &&
                    (() => {
                      const leader = members.find(
                        (m) => m.id === selectedLeaderId
                      );
                      return leader ? (
                        <div>
                          <p className="text-sm text-yellow-700">
                            {leader.name} ({leader.email})
                            {leader.isCreator && (
                              <span className="ml-2 text-blue-600">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            ✅ Leader verified and registered
                          </p>
                        </div>
                      ) : null;
                    })()}
                </div>
              </div>
            </div>

            {/* Number Assignment Method - Stacked on Mobile */}
            <div>
              <h4 className="font-medium text-text mb-3">Assignment Method</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setNumberAssignmentMethod("random");
                    handleRandomizeNumbers();
                  }}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    numberAssignmentMethod === "random"
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="font-medium">Random Draw</div>
                  <div className="text-xs text-text/60 mt-1">
                    System randomly assigns numbers
                  </div>
                </button>

                <button
                  onClick={() => setNumberAssignmentMethod("manual")}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    numberAssignmentMethod === "manual"
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">✍️</div>
                  <div className="font-medium">Manual Assignment</div>
                  <div className="text-xs text-text/60 mt-1">
                    You assign numbers manually
                  </div>
                </button>
              </div>
            </div>

            {/* Number Assignment Interface */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-text">Assign Draw Numbers</h4>
                {numberAssignmentMethod === "random" && (
                  <button
                    onClick={handleRandomizeNumbers}
                    className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Re-randomize</span>
                    <span className="sm:hidden">Shuffle</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {members.map((member) => {
                  const memberNumber = assignedNumbers[member.id];
                  const isLeader = selectedLeaderId === member.id;
                  const availableNumbers = getAvailableNumbersForMember(member.id);

                  return (
                    <div
                      key={member.id}
                      className={`border rounded-lg p-3 sm:p-4 ${
                        isLeader
                          ? "border-yellow-400 bg-yellow-50"
                          : member.isCreator
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${
                            isLeader
                              ? "bg-yellow-100 text-yellow-600"
                              : member.isCreator
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {isLeader ? (
                              <Crown size={20} />
                            ) : member.isCreator ? (
                              <UserPlus size={20} />
                            ) : (
                              <User size={20} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              <span className="truncate">{member.name}</span>
                              {isLeader && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full shrink-0">
                                  Leader
                                </span>
                              )}
                              {member.isCreator && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-text/60 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                          <div className="text-sm text-text/60 sm:hidden">Number:</div>
                          {numberAssignmentMethod === "random" ? (
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                                isLeader
                                  ? "bg-yellow-500 text-white"
                                  : member.isCreator
                                  ? "bg-blue-500 text-white"
                                  : "bg-primary text-white"
                              }`}
                            >
                              {memberNumber || "?"}
                            </div>
                          ) : (
                            <select
                              value={memberNumber || ""}
                              onChange={(e) =>
                                handleManualNumberChange(
                                  member.id,
                                  e.target.value
                                )
                              }
                              className="border border-gray-300 rounded-lg px-3 py-2 w-24 sm:min-w-25 bg-white"
                            >
                              <option value="">Select</option>
                              {availableNumbers.map((num) => (
                                <option key={num} value={num}>
                                  {num}
                                </option>
                              ))}
                              {memberNumber && !availableNumbers.includes(memberNumber) && (
                                <option value={memberNumber} disabled>
                                  {memberNumber} (Cur)
                                </option>
                              )}
                            </select>
                          )}
                        </div>
                      </div>
                      
                      {numberAssignmentMethod === "manual" && memberNumber && (
                        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle size={14} />
                          Assigned number {memberNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Number Sequence Preview */}
            {Object.keys(assignedNumbers).length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-text mb-3">
                  Draw Sequence Preview
                </h4>
                <div className="flex flex-wrap gap-2">
                  {members
                    .sort(
                      (a, b) =>
                        (assignedNumbers[a.id] || 0) -
                        (assignedNumbers[b.id] || 0)
                    )
                    .map((member) => {
                      const number = assignedNumbers[member.id];
                      const isLeader = selectedLeaderId === member.id;

                      return (
                        <div
                          key={member.id}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                            isLeader
                              ? "bg-yellow-100 border border-yellow-200"
                              : member.isCreator
                              ? "bg-blue-100 border border-blue-200"
                              : "bg-gray-100"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isLeader
                                ? "bg-yellow-500 text-white"
                                : member.isCreator
                                ? "bg-blue-500 text-white"
                                : "bg-primary text-white"
                            }`}
                          >
                            {number}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[100px]">
                            {member.name}
                          </span>
                          {isLeader && (
                            <Crown size={12} className="text-yellow-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                </div>
                <p className="text-xs text-text/60 mt-3">
                  This is the order in which members will receive the pool
                  amount each cycle.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        const totalAmountPerCycle =
          parseFloat(formData.contributionAmount) * members.length;
        const totalGroupValue = totalAmountPerCycle * members.length;
        const leader = members.find((m) => m.id === selectedLeaderId);

        return (
          <div className="space-y-6">
            {/* Final Review Header */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-700">
                <CheckCircle size={20} />
                <span className="font-medium">Final Review</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Review all details below before creating the group. This action
                cannot be undone.
              </p>
            </div>

            {/* Group Details */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
              <h3 className="font-bold text-text mb-4 text-lg">
                Group Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-text/60 mb-1">Group Name</div>
                  <div className="font-medium break-words">{formData.name}</div>
                </div>
                <div>
                  <div className="text-sm text-text/60 mb-1">
                    Contribution Amount
                  </div>
                  <div className="font-medium">
                    ₹{formData.contributionAmount} / {formData.frequency}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text/60 mb-1">Duration</div>
                  <div className="font-medium">
                    {members.length} cycles ({members.length}{" "}
                    {formData.frequency}s)
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text/60 mb-1">Start Date</div>
                  <div className="font-medium">
                    {new Date(formData.startDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm text-text/60 mb-1">
                    Total Group Value
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ₹{totalGroupValue.toLocaleString()}
                  </div>
                  <p className="text-sm text-text/60 mt-1">
                    ₹{totalAmountPerCycle.toLocaleString()} collected per cycle
                    × {members.length} cycles
                  </p>
                </div>
              </div>
            </div>

            {/* Leader Section */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
              <h3 className="font-bold text-text mb-4 text-lg">Group Leader</h3>
              {leader && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                      <Crown size={24} className="text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-bold text-lg">{leader.name}</div>
                      <div className="text-sm text-text/60 break-all">{leader.email}</div>
                      {leader.phone && (
                        <div className="text-sm text-text/60">
                          {leader.phone}
                        </div>
                      )}
                      {leader.isCreator && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          <UserPlus size={10} />
                          Group Creator
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-yellow-200 pt-3 sm:pt-0">
                    <div className="text-sm text-text/60">Draw Number</div>
                    <div className="text-2xl font-bold text-primary">
                      #{assignedNumbers[leader.id] || "?"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Members & Draw Order */}
            <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
              <h3 className="font-bold text-text mb-4 text-lg">
                Members & Draw Order
              </h3>
              <div className="space-y-3">
                {members
                  .sort(
                    (a, b) =>
                      (assignedNumbers[a.id] || 0) -
                      (assignedNumbers[b.id] || 0)
                  )
                  .map((member) => {
                    const isLeader = selectedLeaderId === member.id;
                    const drawNumber = assignedNumbers[member.id];

                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          isLeader
                            ? "border-yellow-400 bg-yellow-50"
                            : member.isCreator
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                              isLeader
                                ? "bg-yellow-500 text-white"
                                : member.isCreator
                                ? "bg-blue-500 text-white"
                                : "bg-primary text-white"
                            }`}
                          >
                            {drawNumber}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {member.name}
                              {isLeader && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">
                                  Leader
                                </span>
                              )}
                              {member.isCreator && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-text/60 truncate max-w-[150px] sm:max-w-none">
                              {member.email}
                            </div>
                          </div>
                        </div>
                        <div className="text-right pl-2">
                          <div className="text-[10px] sm:text-sm text-text/60">Receives</div>
                          <div className="font-bold text-sm sm:text-base">
                            ₹{totalAmountPerCycle.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Bank Account */}
            {formData.bankAccount.bankName && (
              <div className="border border-gray-200 rounded-lg p-4 sm:p-5">
                <h3 className="font-bold text-text mb-4 text-lg">
                  Bank Account
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-text/60 mb-1">Bank Name</div>
                    <div className="font-medium">
                      {formData.bankAccount.bankName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-text/60 mb-1">
                      Account Number
                    </div>
                    <div className="font-medium">
                      {formData.bankAccount.accountNumber}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-sm text-text/60 mb-1">
                      Account Holder
                    </div>
                    <div className="font-medium">
                      {formData.bankAccount.accountHolder}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Conditions - Now Required */}
            <div className={`border rounded-lg p-4 ${
              !acceptTerms && step === 4 ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}>
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 shrink-0"
                  required
                />
                <label htmlFor="acceptTerms" className="text-sm text-text/70">
                  I confirm that all information is correct. I understand that
                  as the group leader is responsible for collecting and
                  distributing funds according to the draw order. I agree to the{" "}
                  <span className="text-primary underline cursor-pointer">
                    Group Terms and Conditions
                  </span>
                  . *
                </label>
              </div>
              {!acceptTerms && step === 4 && (
                <p className="text-red-500 text-sm mt-2 ml-7">
                  You must accept the Terms and Conditions to create the group
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card p-4 sm:p-6 mb-10">
      {/* Step Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text mb-2">
          {step === 1 && "Group Details"}
          {step === 2 && "Add Members"}
          {step === 3 && "Select Leader & Assign Numbers"}
          {step === 4 && "Review & Create"}
        </h2>
        <p className="text-text/60 text-sm">
          {step === 1 && "Basic information about your savings group"}
          {step === 2 &&
            `Add exactly ${formData.targetMemberCount} members. Each member = one cycle.`}
          {step === 3 && "Select leader and assign draw numbers"}
          {step === 4 && "Review all details before creating the group"}
        </p>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* ✅ Phone Number Modal */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="text-yellow-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-text">Phone Number Required</h3>
                  <p className="text-sm text-text/60">To join a group, you must add a phone number to your profile.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPhoneModalOpen(false)}
                className="text-text/40 hover:text-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Your Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-3 text-text/40" />
                  <input
                    type="tel"
                    value={missingPhoneInput}
                    onChange={(e) => setMissingPhoneInput(e.target.value)}
                    className="input-field pl-10 w-full"
                    placeholder="+91 1234567890"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-text/40 mt-1">
                  This will be saved to your profile for future use.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text/60 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMissingPhone}
                  disabled={isSavingPhone}
                  className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                >
                  {isSavingPhone ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save & Add Me
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons - Reversed column on mobile for easier Next access */}
      <div className="flex flex-col-reverse sm:flex-row justify-between mt-8 pt-6 border-t border-gray-200 gap-3 sm:gap-0">
        <div>
          {step > 1 ? (
            <button
              onClick={handlePreviousStep}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-text rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              disabled={loading || isCheckingLeader}
            >
              <ChevronRight className="transform rotate-180" size={16} />
              <span>Previous</span>
            </button>
          ) : (
            <button
              onClick={() => router.push("/groups")}
              className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 text-text rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              disabled={loading}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          )}
        </div>

        <div className="w-full sm:w-auto">
          {step < 4 ? (
            <button
              onClick={handleNextStep}
              className="w-full sm:w-auto px-8 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center space-x-2"
              disabled={loading || isCheckingLeader}
            >
              <span>{step === 2 ? "Verify & Continue" : "Next Step"}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !acceptTerms}
              className="w-full sm:w-auto px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Create Group</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}