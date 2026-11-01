import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSmsProvider } from "./create-sms-provider.js";
import {
  DisabledSmsProvider,
  InMemorySmsProvider,
  SmsNotConfiguredError,
} from "./sms-provider.js";
import { TwilioSmsProvider } from "./twilio-sms-provider.js";

describe("SMS provider factory", () => {
  it("defaults to a disabled provider that never sends", async () => {
    const provider = createSmsProvider({} as NodeJS.ProcessEnv);
    assert.equal(provider instanceof DisabledSmsProvider, true);
    await assert.rejects(
      provider.send({ to: "+84912345678", body: "x" }),
      SmsNotConfiguredError,
    );
  });

  it("requires credentials for twilio", () => {
    assert.throws(() =>
      createSmsProvider({ SMS_PROVIDER: "twilio" } as NodeJS.ProcessEnv),
    );
  });

  it("rejects unknown providers", () => {
    assert.throws(() =>
      createSmsProvider({ SMS_PROVIDER: "nope" } as NodeJS.ProcessEnv),
    );
  });
});

describe("TwilioSmsProvider", () => {
  it("posts form data with basic auth", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response("{}", { status: 201 });
    }) as unknown as typeof fetch;

    const provider = new TwilioSmsProvider(
      {
        accountSid: "ACtest",
        authToken: "token",
        messagingServiceSid: "MGtest",
      },
      fakeFetch,
    );
    await provider.send({ to: "+84912345678", body: "code 123456" });

    assert.ok(captured);
    assert.match(captured.url, /Accounts\/ACtest\/Messages\.json$/);
    const headers = captured.init.headers as Record<string, string>;
    assert.equal(
      headers.Authorization,
      `Basic ${Buffer.from("ACtest:token").toString("base64")}`,
    );
    const form = captured.init.body as URLSearchParams;
    assert.equal(form.get("To"), "+84912345678");
    assert.equal(form.get("MessagingServiceSid"), "MGtest");
  });

  it("does not leak the OTP, phone number or token in delivery errors", async () => {
    const fakeFetch = (async () =>
      new Response("denied", { status: 401 })) as unknown as typeof fetch;
    const provider = new TwilioSmsProvider(
      {
        accountSid: "ACtest",
        authToken: "secret-token",
        fromNumber: "+15550001111",
      },
      fakeFetch,
    );

    await assert.rejects(
      provider.send({ to: "+84912345678", body: "code 654321" }),
      (error: Error) => {
        assert.doesNotMatch(error.message, /654321|84912345678|secret-token/);
        return true;
      },
    );
  });

  it("InMemorySmsProvider records messages for tests", async () => {
    const provider = new InMemorySmsProvider();
    await provider.send({ to: "+84912345678", body: "x" });
    assert.equal(provider.sent.length, 1);
  });
});
