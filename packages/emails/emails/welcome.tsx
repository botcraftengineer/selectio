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

import { emailTailwindConfig } from "../tailwind";

const baseUrl = "https://selectio-web.vercel.app";

export default function WelcomeEmail({
  username = "username",
}: {
  username: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>Добро пожаловать в Selectio</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
              Добро пожаловать в{" "}
              <Link
                href="https://selectio-web.vercel.app"
                className="text-black"
              >
                <strong>Selectio</strong>
              </Link>
            </Heading>
            <Text className="text-[14px] leading-[24px] text-black">
              Здравствуйте, {username}!
            </Text>
            <Text className="text-[14px] leading-[24px] text-black">
              Мы рады приветствовать вас в Selectio! Ваш аккаунт был успешно
              создан на{" "}
              <Link
                href="https://selectio-web.vercel.app"
                className="text-black"
              >
                <strong>selectio-web.vercel.app</strong>
              </Link>
              .
            </Text>
            <Section className="mb-[32px] mt-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center text-[14px] font-semibold text-white no-underline"
                href={`${baseUrl}`}
              >
                Начать работу
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">
              Если кнопка выше не работает, скопируйте и вставьте этот URL в ваш
              браузер:
            </Text>
            <Text className="mb-[20px]">
              <Link href={`${baseUrl}`} className="text-black no-underline">
                <strong>{baseUrl}</strong>
              </Link>
            </Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">
              Это письмо было отправлено на{" "}
              <span className="text-black">{username}</span>. Если вы не
              создавали аккаунт в Selectio, просто проигнорируйте это письмо или
              свяжитесь с нашей службой поддержки, если у вас есть вопросы.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
