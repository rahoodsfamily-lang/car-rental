import React from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';
import theme from './theme';

const ThemeProvider = ({ children }) => {
  return (
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </StyledEngineProvider>
  );
};

export default ThemeProvider;
