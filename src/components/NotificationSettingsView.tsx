import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Bell,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  UserCheck,
  Smartphone,
  Radio,
  Users,
  CheckCheck,
} from 'lucide-react';
import { googleSignIn, initAuth, logoutGoogle, verifyTokenScopes } from '../services/googleAuth';
import { sendGmailMessage, SendEmailResult } from '../services/gmailService';
import { User } from 'firebase/auth';

interface SentLog {
  id: string;
  recipient: string;
  subject: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

export const NotificationSettingsView: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [scopeWarning, setScopeWarning] = useState<boolean>(false);

  // Email form state (pre-filled according to operator requirement)
  const [recipient, setRecipient] = useState<string>('licheng.yan@siemens.com');
  const [subject, setSubject] = useState<string>('FabCore Alert: Test Notification');
  const [body, setBody] = useState<string>('hello world');

  // Sending state & feedback
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastSentResult, setLastSentResult] = useState<SendEmailResult | null>(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);

  // Mandatory confirmation dialog state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Dispatch audit log
  const [dispatchLogs, setDispatchLogs] = useState<SentLog[]>([]);

  // Mobile operator push alert state (Licheng, Mario, Zhuqi, Weiliang)
  const [targetOperatorId, setTargetOperatorId] = useState<string>('all');
  const [operatorSeverity, setOperatorSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [operatorAlertTitle, setOperatorAlertTitle] = useState<string>('Equipment Inspection: CHW-P-01 High DP');
  const [operatorAlertMsg, setOperatorAlertMsg] = useState<string>('Differential pressure alert triggered. Please scan asset QR code to verify valve lineup.');
  const [isPushingMobile, setIsPushingMobile] = useState<boolean>(false);
  const [pushSuccessMsg, setPushSuccessMsg] = useState<string | null>(null);
  const [recentMobileAlerts, setRecentMobileAlerts] = useState<any[]>([]);

  // Fetch mobile alerts from shared Node.js backend
  const fetchMobileAlerts = async () => {
    try {
      const res = await fetch('/api/mobile/notifications');
      if (res.ok) {
        const data = await res.json();
        setRecentMobileAlerts(data.notifications || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchMobileAlerts();
    const timer = setInterval(fetchMobileAlerts, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePushMobileAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPushingMobile(true);
    setPushSuccessMsg(null);
    try {
      const res = await fetch('/api/mobile/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetOperatorId,
          title: operatorAlertTitle,
          message: operatorAlertMsg,
          severity: operatorSeverity,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushSuccessMsg(data.message || 'Notification dispatched successfully to mobile operator(s)!');
        fetchMobileAlerts();
      }
    } catch {
      // Fallback
    } finally {
      setIsPushingMobile(false);
    }
  };

  // Check token scopes whenever accessToken changes
  const checkScopes = async (token: string) => {
    const check = await verifyTokenScopes(token);
    if (!check.hasGmailScope) {
      setScopeWarning(true);
    } else {
      setScopeWarning(false);
    }
  };

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        setAuthError(null);
        if (token) {
          await checkScopes(token);
        }
      },
      () => {
        // If not authenticated or token expired
        setAccessToken(null);
        setScopeWarning(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async (forceConsent = true) => {
    setIsAuthenticating(true);
    setAuthError(null);
    setSendErrorMessage(null);
    try {
      const result = await googleSignIn(forceConsent);
      setCurrentUser(result.user);
      setAccessToken(result.accessToken);
      await checkScopes(result.accessToken);
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setAuthError(err?.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setAccessToken(null);
      setScopeWarning(false);
      setSendSuccessMessage(null);
      setSendErrorMessage(null);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  // Direct web Gmail fallback link
  const openWebGmail = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipient.trim()
    )}&su=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Direct Yahoo Mail compose fallback
  const openYahooMail = () => {
    const url = `https://compose.mail.yahoo.com/?to=${encodeURIComponent(
      recipient.trim()
    )}&subj=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Direct system default mail client (Outlook / Apple Mail / local client)
  const openMailto = () => {
    const url = `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(
      subject.trim()
    )}&body=${encodeURIComponent(body.trim())}`;
    window.location.href = url;
  };

  // Trigger confirmation modal (Mandatory security rule for mutating/sending operations)
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setSendErrorMessage('Please enter a valid recipient email address.');
      return;
    }
    if (!accessToken) {
      setSendErrorMessage('You must sign in with Google first before sending emails.');
      return;
    }
    setSendErrorMessage(null);
    setShowConfirmModal(true);
  };

  // Confirmed execution
  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    if (!accessToken) {
      setSendErrorMessage('Google session expired. Please sign in again.');
      return;
    }

    setIsSending(true);
    setSendSuccessMessage(null);
    setSendErrorMessage(null);

    const logEntryId = `LOG-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();

    try {
      const result = await sendGmailMessage({
        to: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
        accessToken,
      });

      setLastSentResult(result);
      setSendSuccessMessage(
        `Email successfully dispatched to ${recipient}! Message ID: ${result.id}`
      );

      setDispatchLogs(prev => [
        {
          id: logEntryId,
          recipient: recipient.trim(),
          subject: subject.trim(),
          timestamp,
          status: 'SUCCESS',
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Error sending email:', err);
      const errMsg = err?.message || 'Failed to dispatch email via Gmail API.';
      setSendErrorMessage(errMsg);
      if (errMsg.toLowerCase().includes('insufficient authentication scopes') || errMsg.toLowerCase().includes('scope')) {
        setScopeWarning(true);
      }

      setDispatchLogs(prev => [
        {
          id: logEntryId,
          recipient: recipient.trim(),
          subject: subject.trim(),
          timestamp,
          status: 'FAILED',
          error: errMsg,
        },
        ...prev,
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="notification-settings-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Notification Settings
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Gmail API
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure industrial alert dispatch channels and test live notification delivery.
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {accessToken ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Google Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Authentication Required</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Authorization & Configuration Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Authentication Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Authorized Google Account
            </h2>

            {currentUser && accessToken ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.displayName || 'Authorized User'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">OAuth Scope</span>
                    <span className="font-mono text-[10px] text-slate-700">gmail.send</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Status</span>
                    {scopeWarning ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        Scope Consent Needed
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active & Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* External email domain advice (e.g. Yahoo / Outlook Google accounts) */}
                {currentUser.email && !currentUser.email.toLowerCase().endsWith('@gmail.com') && !currentUser.email.toLowerCase().endsWith('@google.com') && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">External Google Account</p>
                        <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                          Signed in as <strong>{currentUser.email}</strong>. Google accounts linked to external mailboxes (Yahoo, Outlook) do not have a native Gmail service enabled. To send via Gmail API, switch to a <strong>@gmail.com</strong> account.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSignIn(true)}
                      className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Switch to @gmail.com Account
                    </button>
                  </div>
                )}

                {scopeWarning && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Scope Permission Required</p>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                          Your current Google token lacks the <code>gmail.send</code> permission. Please click below to open Google consent and make sure <strong>"Send email on your behalf"</strong> is checked.
                        </p>
                      </div>
                    </div>
                    <button
                      id="btn-reconsent-gmail"
                      type="button"
                      onClick={() => handleSignIn(true)}
                      disabled={isAuthenticating}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-Authorize & Grant Gmail Scope
                    </button>
                  </div>
                )}

                <button
                  id="btn-google-signout"
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of Google
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sign in with your Google Workspace or Gmail account to authorize this application to dispatch facility alerts directly from your email address.
                </p>

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Official Material Design "Sign in with Google" Button */}
                <button
                  id="btn-google-signin"
                  type="button"
                  onClick={() => handleSignIn(true)}
                  disabled={isAuthenticating}
                  className="w-full h-11 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-3 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isAuthenticating ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>{isAuthenticating ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Security & Permissions Info */}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 text-xs space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Workspace Security Standards</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              This application adheres to the principle of least privilege:
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
              <li>Only requests permission to send notification emails.</li>
              <li>Cannot read your existing mailbox or inbox threads.</li>
              <li>Tokens are maintained in volatile memory and never saved to local disk storage.</li>
              <li>Every outbound email requires explicit operator confirmation.</li>
            </ul>
          </div>
        </div>

        {/* Middle & Right Column: Test Email Sender Form & Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Email Dispatch Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  Test Email Dispatcher
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send a live test message via the Gmail API to verify routing and deliverability.
                </p>
              </div>
            </div>

            {/* Feedback Notifications */}
            {sendSuccessMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{sendSuccessMessage}</p>
                  <p className="text-[11px] text-emerald-700">Check the recipient inbox or spam folder.</p>
                </div>
              </div>
            )}

            {sendErrorMessage && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold">Dispatch Error</p>
                    <p className="text-[11px] text-red-700 leading-relaxed">{sendErrorMessage}</p>
                  </div>
                </div>

                {sendErrorMessage.toLowerCase().includes('insufficient authentication scopes') && (
                  <div className="pt-2 border-t border-red-200/70 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSignIn(true)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Re-Authorize Google Account (Grant Send Permission)
                    </button>
                    <button
                      type="button"
                      onClick={openWebGmail}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-[11px] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Draft Directly in Gmail
                    </button>
                  </div>
                )}

                {sendErrorMessage.toLowerCase().includes('mail service not enabled') && (
                  <div className="pt-2.5 border-t border-red-200/70 space-y-2">
                    <p className="text-[11px] font-semibold text-red-900">
                      Direct send options for this account:
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSignIn(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Switch to a @gmail.com Account
                      </button>
                      <button
                        type="button"
                        onClick={openYahooMail}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-[11px] rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Send via Yahoo Mail Web
                      </button>
                      <button
                        type="button"
                        onClick={openMailto}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-[11px] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3 h-3" />
                        Open in System Mail App
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleInitiateSend} className="space-y-4">
              {/* Recipient Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Recipient Email Address
                </label>
                <input
                  id="input-email-recipient"
                  type="email"
                  required
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="e.g. licheng.yan@siemens.com"
                  className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject Line
                </label>
                <input
                  id="input-email-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Notification subject"
                  className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Body Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message Content (Body)
                </label>
                <textarea
                  id="input-email-body"
                  rows={4}
                  required
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Enter email body..."
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans resize-y"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  {accessToken ? 'Ready to dispatch via authenticated account' : 'Authentication required for direct API'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-open-yahoo-mail"
                    type="button"
                    onClick={openYahooMail}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200 transition-all cursor-pointer"
                    title="Open pre-filled draft in Yahoo Mail"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                    <span>Yahoo Mail</span>
                  </button>
                  <button
                    id="btn-open-web-gmail"
                    type="button"
                    onClick={openWebGmail}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-2xs transition-all cursor-pointer"
                    title="Open pre-filled draft in Gmail web app"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Gmail Web</span>
                  </button>
                  <button
                    id="btn-send-test-email"
                    type="submit"
                    disabled={!accessToken || isSending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Email...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send via Gmail API</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Dispatch Activity History */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent Dispatch Log
            </h2>

            {dispatchLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-200 rounded-xl">
                No notification emails sent in this session yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {dispatchLogs.map(log => (
                  <div key={log.id} className="p-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{log.recipient}</span>
                        <span className="text-slate-400 text-[10px]">{log.timestamp}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">Subject: {log.subject}</p>
                    </div>
                    <div>
                      {log.status === 'SUCCESS' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                          Sent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* FIELD MOBILE OPERATOR DIRECT DISPATCH (Shared Node.js Backend)             */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  Cleanroom Mobile Operator Dispatch
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Push targeted industrial alerts to individual field operators or broadcast to all 4 shift personnel.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-mono text-[10px] font-bold rounded-full border border-amber-200/80 w-fit">
                Shared Node.js Multi-User Engine
              </span>
            </div>

            {pushSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{pushSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handlePushMobileAlert} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Operator Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Operator
                  </label>
                  <select
                    value={targetOperatorId}
                    onChange={(e) => setTargetOperatorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    <option value="all">📢 Broadcast to All 4 Operators</option>
                    <option value="licheng">👤 Licheng (Facility Lead)</option>
                    <option value="mario">👤 Mario (Mechanical Systems)</option>
                    <option value="zhuqi">👤 Zhuqi (Electrical & Automation)</option>
                    <option value="weiliang">👤 Weiliang (EHS & Safety)</option>
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alert Severity
                  </label>
                  <select
                    value={operatorSeverity}
                    onChange={(e) => setOperatorSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    <option value="INFO">ℹ️ INFO (Informational)</option>
                    <option value="WARNING">⚠️ WARNING (Operational Drift)</option>
                    <option value="CRITICAL">🚨 CRITICAL (Immediate Action)</option>
                  </select>
                </div>
              </div>

              {/* Alert Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alert Title / Tag Reference
                </label>
                <input
                  type="text"
                  required
                  value={operatorAlertTitle}
                  onChange={(e) => setOperatorAlertTitle(e.target.value)}
                  placeholder="e.g. Pump P-01 Vibration Exceeded"
                  className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Alert Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispatch Instructions
                </label>
                <textarea
                  rows={2}
                  required
                  value={operatorAlertMsg}
                  onChange={(e) => setOperatorAlertMsg(e.target.value)}
                  placeholder="Instructions for operator..."
                  className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-400">
                  Password for all 4 mobile accounts is: <code className="text-slate-600 font-bold">root</code>
                </p>
                <button
                  type="submit"
                  disabled={isPushingMobile}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isPushingMobile ? 'Pushing...' : 'Push Alert to Mobile'}</span>
                </button>
              </div>
            </form>

            {/* Live Dispatched Operator Alerts History */}
            {recentMobileAlerts.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Recent Dispatched Push Alerts ({recentMobileAlerts.length})</span>
                  <span className="text-[10px] text-slate-400">Auto-synced</span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentMobileAlerts.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.severity === 'CRITICAL'
                                ? 'bg-red-100 text-red-700'
                                : item.severity === 'WARNING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {item.severity}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">{item.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Target: <strong className="text-slate-600">{item.targetUserId}</strong> &bull;{' '}
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {item.acknowledged ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                            <CheckCheck className="w-3 h-3" />
                            ACK by {item.acknowledgedBy || 'Operator'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full animate-pulse">
                            Pending ACK
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subtle System Diagnostics & Session Maintenance */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Gateway Protocol: SMTP/REST v2.4 &bull; Service Sync: Nominal</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded hover:bg-slate-100 cursor-pointer"
            title="Sync gateway cache and reload application runtime"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync & Reload App</span>
          </button>
        </div>
      </div>

      {/* MANDATORY Confirmation Dialog (Google Workspace Safety Requirement) */}
      {showConfirmModal && (
        <div
          id="confirm-send-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Email Dispatch</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to send an email through your connected Google Workspace account.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Recipient</span>
                <span className="font-medium text-slate-800 font-mono">{recipient}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subject</span>
                <span className="font-medium text-slate-800">{subject}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Message Preview</span>
                <span className="text-slate-700 font-mono text-[11px] block mt-0.5 bg-white p-2 rounded border border-slate-200">
                  {body}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-confirm-cancel"
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-send"
                type="button"
                onClick={handleConfirmSend}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
