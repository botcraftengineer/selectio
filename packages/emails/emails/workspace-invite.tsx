import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { env } from "@selectio/config";

import { emailTailwindConfig } from "../tailwind";

interface WorkspaceInviteEmailProps {
  workspaceName: string;
  workspaceLogo?: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

export default function WorkspaceInviteEmail({
  workspaceName = "Workspace",
  workspaceLogo,
  inviterName = "Пользователь",
  inviteLink = `${env.APP_URL}/invite/token`,
  role = "участника",
}: WorkspaceInviteEmailProps) {
  const roleNames: Record<string, string> = {
    owner: "владельца",
    admin: "администратора",
    member: "участника",
  };

  const roleName = roleNames[role] || role;

  return (
    <Html>
      <Head />
      <Preview>
        Приглашение в {workspaceName} от {inviterName}
      </Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            {workspaceLogo && (
              <Section className="mb-[32px] text-center">
                <img
                  src={workspaceLogo}
                  alt={workspaceName}
                  className="mx-auto h-16 w-16 rounded-lg object-cover"
                />
              </Section>
            )}

            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Приглашение в{" "}
              <Link href={env.APP_URL} className="text-black">
                <strong>{env.APP_NAME}</strong>
              </Link>
            </Heading>

            <Text className="text-[14px] leading-[24px] text-black">
              Здравствуйте!
            </Text>

            <Text className="text-[14px] leading-[24px] text-black">
              <strong>{inviterName}</strong> приглашает вас присоединиться к
              workspace <strong>{workspaceName}</strong> в роли {roleName}.
            </Text>

            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center text-[14px] font-semibold text-white no-underline"
                href={inviteLink}
              >
                Принять приглашение
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-black">
              Если кнопка выше не работает, скопируйте и вставьте этот URL в ваш
              браузер:
            </Text>
            <Text className="mb-[20px]">
              <Link href={inviteLink} className="text-black no-underline">
                <strong>{inviteLink}</strong>
              </Link>
            </Text>

            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />

            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это приглашение действительно в течение 7 дней. Если вы не хотите
              присоединяться к этому workspace, просто проигнорируйте это
              письмо.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
