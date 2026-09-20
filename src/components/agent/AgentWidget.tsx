"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import rainAiLogo from "@/assets/images/rain_ai_logo.svg";
import { mockAgentReply, sendAgentMessage } from "@/lib/graphql/agent";

type AgentMessage = {
	content: string;
	id: string;
	role: "assistant" | "user";
};

type AgentWidgetProps = {
	endpoint: string | null;
};

export function AgentWidget({ endpoint }: AgentWidgetProps) {
	const t = useTranslations("agent");
	const panelId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [pending, setPending] = useState(false);
	const [messages, setMessages] = useState<AgentMessage[]>([
		{
			id: "welcome",
			role: "assistant",
			content: t("welcome"),
		},
	]);

	useEffect(() => {
		if (open) {
			inputRef.current?.focus();
		}
	}, [open]);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = input.trim();
		if (!trimmed || pending) {
			return;
		}

		const userMessage: AgentMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			content: trimmed,
		};

		setMessages((current) => [...current, userMessage]);
		setInput("");
		setPending(true);

		try {
			const reply = endpoint
				? await sendAgentMessage(endpoint, trimmed)
				: await Promise.resolve(mockAgentReply(trimmed));

			setMessages((current) => [
				...current,
				{
					id: `assistant-${Date.now()}`,
					role: "assistant",
					content: reply,
				},
			]);
		} catch {
			setMessages((current) => [
				...current,
				{
					id: `assistant-error-${Date.now()}`,
					role: "assistant",
					content: t("error"),
				},
			]);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
			{open ? (
				<div
					id={panelId}
					role="dialog"
					aria-label={t("panelLabel")}
					className="surface-card flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-3xl border border-border shadow-lg"
				>
					<div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
						<div>
							<p className="font-medium text-foreground">
								{t("title")}
							</p>
							<p className="text-xs text-foreground-muted">
								{endpoint ? t("liveMode") : t("demoMode")}
							</p>
						</div>
						<button
							type="button"
							onClick={() => setOpen(false)}
							aria-label={t("close")}
							className="inline-flex size-8 items-center justify-center rounded-full border border-border text-foreground-muted hover:text-foreground"
						>
							×
						</button>
					</div>
					<div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
						{messages.map((message) => (
							<div
								key={message.id}
								className={
									message.role === "user"
										? "ml-8 rounded-2xl bg-brand px-3 py-2 text-sm text-brand-foreground"
										: "mr-8 rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground-muted"
								}
							>
								{message.content}
							</div>
						))}
						{pending ? (
							<p
								className="text-sm text-foreground-muted"
								aria-live="polite"
							>
								{t("thinking")}
							</p>
						) : null}
					</div>
					<form
						onSubmit={handleSubmit}
						className="border-t border-border-subtle p-4"
					>
						<label htmlFor={`${panelId}-input`} className="sr-only">
							{t("inputLabel")}
						</label>
						<div className="flex gap-2">
							<input
								ref={inputRef}
								id={`${panelId}-input`}
								value={input}
								onChange={(event) =>
									setInput(event.target.value)
								}
								placeholder={t("placeholder")}
								className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
							/>
							<button
								type="submit"
								disabled={pending}
								className="btn-primary px-4 py-2 text-sm"
							>
								{t("send")}
							</button>
						</div>
					</form>
				</div>
			) : null}
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-controls={panelId}
				aria-label={open ? t("close") : t("openButtonLabel")}
				className="btn-primary rounded-full px-5 py-3 shadow-lg"
			>
				{open ? (
					t("close")
				) : (
          <span className="inline-flex items-end gap-0.5 text-xl leading-none">
						{t("open")}
						<Image
							src={rainAiLogo}
							alt=""
							width={49}
							height={20}
							unoptimized
              className="h-5 w-auto -translate-y-0.5 brightness-0 invert"
							aria-hidden
						/>
					</span>
				)}
			</button>
		</div>
	);
}
