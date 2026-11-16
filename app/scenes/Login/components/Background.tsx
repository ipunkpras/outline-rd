import * as React from "react";
import styled, { ThemeProvider } from "styled-components";
import { buildDarkTheme } from "@shared/styles/theme";
import Fade from "~/components/Fade";
import { draggableOnDesktop } from "~/styles";
import { WikiGraphCanvas } from "./WikiGraphCanvas";

/**
 * Login pages are always rendered dark so text stays readable on the
 * animated background, regardless of the user's light/dark preference.
 */
const loginTheme = buildDarkTheme({ accent: "#005BEA" });

type Props = {
  children?: React.ReactNode;
};

export const Background = ({ children }: Props) => (
  <ThemeProvider theme={loginTheme}>
    <Wrapper>
      <WikiGraphCanvas />
      {children}
    </Wrapper>
  </ThemeProvider>
);

const Wrapper = styled(Fade)`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100vw;
  height: 100%;
  display: flex;
  color: ${(props) => props.theme.text};
  background:
    radial-gradient(
      ellipse 60% 50% at 50% 38%,
      rgba(0, 91, 234, 0.22) 0%,
      rgba(0, 91, 234, 0) 70%
    ),
    radial-gradient(
      ellipse 80% 60% at 50% 120%,
      rgba(1, 24, 74, 0.9) 0%,
      rgba(1, 24, 74, 0) 70%
    ),
    #121318;
  ${draggableOnDesktop()}
`;
