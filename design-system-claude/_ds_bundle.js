/* @ds-bundle: {"format":4,"namespace":"RosevilleNewChurchDesignSystem_094ee1","components":[{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/display/Badge.jsx":"519ea6195d8a","components/display/Card.jsx":"c72fcb5a7f1c","components/display/Tag.jsx":"88828b7d6cbf","components/feedback/Dialog.jsx":"498538d3cb11","components/feedback/Toast.jsx":"c9e2cb06e46b","components/feedback/Tooltip.jsx":"21486a17b669","components/forms/Button.jsx":"bf8f8e70a477","components/forms/Checkbox.jsx":"0f4397c50113","components/forms/IconButton.jsx":"475bd3bfe821","components/forms/Input.jsx":"df766857283f","components/forms/Radio.jsx":"097ad84d2d90","components/forms/Select.jsx":"e215e6eb2ada","components/forms/Switch.jsx":"993df9459a5c","components/navigation/Tabs.jsx":"484b495ed9c8","ui_kits/website/AboutPage.jsx":"83fc7aaaea63","ui_kits/website/EventsPage.jsx":"fcef75fd222d","ui_kits/website/Footer.jsx":"b52f60f7bf56","ui_kits/website/Header.jsx":"e7b8e063bae5","ui_kits/website/HomePage.jsx":"2c3da6d6098d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.RosevilleNewChurchDesignSystem_094ee1 = window.RosevilleNewChurchDesignSystem_094ee1 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Badge.jsx
try { (() => {
function Badge({
  tone = 'violet',
  children,
  style
}) {
  const tones = {
    violet: {
      bg: 'var(--rnc-violet-100)',
      fg: 'var(--rnc-violet-700)'
    },
    gold: {
      bg: 'var(--rnc-gold-100)',
      fg: 'var(--rnc-gold-600)'
    },
    success: {
      bg: 'var(--status-success-bg)',
      fg: 'var(--status-success)'
    },
    warning: {
      bg: 'var(--status-warning-bg)',
      fg: 'var(--status-warning)'
    },
    error: {
      bg: 'var(--status-error-bg)',
      fg: 'var(--status-error)'
    },
    info: {
      bg: 'var(--status-info-bg)',
      fg: 'var(--status-info)'
    }
  };
  const t = tones[tone] || tones.violet;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      padding: '5px 12px 3px',
      borderRadius: 'var(--radius-pill)',
      background: t.bg,
      color: t.fg,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  variant = 'default',
  interactive,
  eyebrow,
  title,
  children,
  footer,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const looks = {
    default: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-soft)'
    },
    tint: {
      background: 'var(--surface-tint)',
      border: '1px solid var(--border-soft)'
    },
    dusk: {
      background: 'var(--rnc-gradient-dusk)',
      border: 'none'
    }
  };
  const dark = variant === 'dusk';
  return /*#__PURE__*/React.createElement("div", _extends({}, rest, {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      boxShadow: interactive && hover ? 'var(--shadow-lift)' : 'var(--shadow-card)',
      transform: interactive && hover ? 'translateY(-2px)' : 'none',
      transition: 'all var(--duration-soft) var(--ease-gentle)',
      cursor: interactive ? 'pointer' : 'default',
      ...looks[variant],
      ...style
    }
  }), eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-eyebrow)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-eyebrow)',
      textTransform: 'uppercase',
      color: dark ? 'var(--rnc-gold-300)' : 'var(--accent-primary)',
      marginBottom: 10
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-h3)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-display)',
      color: dark ? 'var(--text-on-dark)' : 'var(--text-heading)',
      marginBottom: 8
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-body)',
      color: dark ? 'rgba(246,242,251,.85)' : 'var(--text-body)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, footer));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function Tag({
  children,
  onRemove,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-display)',
      fontSize: 13,
      padding: '6px 14px 4px',
      borderRadius: 'var(--radius-pill)',
      background: '#fff',
      border: '1px solid var(--border-strong)',
      color: 'var(--text-heading)',
      ...style
    }
  }, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": "Remove",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      padding: 0,
      marginTop: -2,
      display: 'flex',
      color: hover ? 'var(--status-error)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 460
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(35,19,56,.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true",
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lift)',
      maxWidth: width,
      width: '100%',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--text-h3)',
      letterSpacing: 'var(--tracking-display)',
      color: 'var(--text-heading)'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      padding: 4,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--leading-body)',
      color: 'var(--text-body)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 'var(--space-5)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = 'success',
  children,
  onDismiss,
  style
}) {
  const tones = {
    success: {
      fg: 'var(--status-success)'
    },
    warning: {
      fg: 'var(--status-warning)'
    },
    error: {
      fg: 'var(--status-error)'
    },
    info: {
      fg: 'var(--status-info)'
    }
  };
  const t = tones[tone] || tones.success;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--surface-inverse)',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      padding: '12px 18px',
      borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-lift)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: t.fg,
      flex: 'none'
    }
  }), children, onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    "aria-label": "Dismiss",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      color: 'rgba(246,242,251,.6)',
      padding: 0,
      display: 'flex',
      marginLeft: 4
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children,
  side = 'top'
}) {
  const [show, setShow] = React.useState(false);
  const pos = side === 'bottom' ? {
    top: 'calc(100% + 8px)'
  } : {
    bottom: 'calc(100% + 8px)'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      ...pos,
      background: 'var(--surface-inverse)',
      color: 'var(--text-on-dark)',
      fontFamily: 'var(--font-display)',
      fontSize: 12.5,
      letterSpacing: '.03em',
      padding: '7px 12px 5px',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      zIndex: 50,
      boxShadow: 'var(--shadow-card)'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false),
    [press, setPress] = React.useState(false);
  const pads = {
      sm: '9px 18px 7px',
      md: '13px 26px 11px',
      lg: '17px 34px 15px'
    },
    fs = {
      sm: 13,
      md: 15,
      lg: 17
    };
  const base = {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: pads[size],
    fontSize: fs[size],
    lineHeight: 1,
    transition: 'background var(--duration-quick) var(--ease-gentle),transform var(--duration-quick) var(--ease-gentle)',
    transform: press && !disabled ? 'scale(.98)' : 'none',
    opacity: disabled ? .45 : 1
  };
  const looks = {
    primary: {
      background: hover && !disabled ? 'var(--accent-primary-strong)' : 'var(--accent-primary)',
      color: 'var(--text-on-accent)'
    },
    secondary: {
      background: hover && !disabled ? 'var(--rnc-violet-100)' : 'transparent',
      color: 'var(--accent-primary-strong)',
      borderColor: 'var(--rnc-violet-200)'
    },
    gold: {
      background: hover && !disabled ? 'var(--rnc-gold-600)' : 'var(--rnc-gold-500)',
      color: '#fff'
    },
    ghost: {
      background: hover && !disabled ? 'var(--rnc-violet-50)' : 'transparent',
      color: 'var(--accent-primary-strong)'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({}, rest, {
    disabled: disabled,
    style: {
      ...base,
      ...looks[variant],
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false)
  }), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .45 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--text-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 22,
      height: 22,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0,
      cursor: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 7,
      border: '1.5px solid ' + (checked ? 'var(--accent-primary)' : 'var(--border-strong)'),
      background: checked ? 'var(--accent-primary)' : '#fff',
      transition: 'all var(--duration-quick) var(--ease-gentle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 40,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const looks = {
    ghost: {
      background: hover ? 'var(--rnc-violet-100)' : 'transparent',
      color: 'var(--accent-primary-strong)'
    },
    tinted: {
      background: hover ? 'var(--rnc-violet-200)' : 'var(--rnc-violet-100)',
      color: 'var(--accent-primary-strong)'
    },
    primary: {
      background: hover ? 'var(--accent-primary-strong)' : 'var(--accent-primary)',
      color: '#fff'
    }
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label
  }, rest, {
    style: {
      width: size,
      height: size,
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--duration-quick) var(--ease-gentle)',
      ...looks[variant],
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }), icon);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-display)',
      fontSize: 14,
      color: 'var(--text-heading)',
      ...style
    }
  }, label, /*#__PURE__*/React.createElement("input", _extends({}, rest, {
    onFocus: e => {
      setFocus(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur && rest.onBlur(e);
    },
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--text-body)',
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid ' + (error ? 'var(--status-error)' : focus ? 'var(--accent-primary)' : 'var(--border-strong)'),
      outline: 'none',
      background: '#fff',
      boxShadow: focus ? 'var(--shadow-glow)' : 'none',
      transition: 'box-shadow var(--duration-quick) var(--ease-gentle)'
    }
  })), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--status-error)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--text-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  checked,
  onChange,
  name,
  value,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .45 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--text-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 22,
      height: 22,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    disabled: disabled,
    onChange: () => onChange && onChange(value),
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0,
      cursor: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      border: '1.5px solid ' + (checked ? 'var(--accent-primary)' : 'var(--border-strong)'),
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--duration-quick) var(--ease-gentle)'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: 'var(--accent-primary)'
    }
  }))), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  options = [],
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-display)',
      fontSize: 14,
      color: 'var(--text-heading)',
      ...style
    }
  }, label, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({}, rest, {
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      appearance: 'none',
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--text-body)',
      padding: '12px 40px 12px 16px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid ' + (focus ? 'var(--accent-primary)' : 'var(--border-strong)'),
      outline: 'none',
      background: '#fff',
      boxShadow: focus ? 'var(--shadow-glow)' : 'none'
    }
  }), options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("svg", {
    style: {
      position: 'absolute',
      right: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none'
    },
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--accent-primary)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  label,
  checked,
  onChange,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .45 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 16,
      color: 'var(--text-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => !disabled && onChange && onChange(!checked),
    style: {
      width: 44,
      height: 26,
      borderRadius: 13,
      background: checked ? 'var(--accent-primary)' : 'var(--rnc-stone-300)',
      position: 'relative',
      transition: 'background var(--duration-soft) var(--ease-gentle)',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(46,26,71,.3)',
      transition: 'left var(--duration-soft) var(--ease-gentle)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  tabs = [],
  active,
  onChange,
  style
}) {
  const [hover, setHover] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-soft)',
      ...style
    }
  }, tabs.map(t => {
    const id = typeof t === 'string' ? t : t.id,
      label = typeof t === 'string' ? t : t.label,
      is = id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      role: "tab",
      "aria-selected": is,
      onClick: () => onChange && onChange(id),
      onMouseEnter: () => setHover(id),
      onMouseLeave: () => setHover(null),
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 15,
        letterSpacing: '.03em',
        padding: '10px 18px 12px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: is ? 'var(--accent-primary-strong)' : hover === id ? 'var(--text-heading)' : 'var(--text-muted)',
        boxShadow: is ? 'inset 0 -2.5px 0 var(--accent-primary)' : 'none',
        transition: 'color var(--duration-quick) var(--ease-gentle)'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/AboutPage.jsx
try { (() => {
function AboutPage() {
  const NS = window.RosevilleNewChurchDesignSystem_094ee1;
  const {
    Card,
    Button
  } = NS;
  return /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--container-prose)',
      margin: '0 auto',
      padding: '56px 32px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--accent-primary)',
      marginBottom: 10
    }
  }, "\u2726 About us"), /*#__PURE__*/React.createElement("h1", {
    style: {
      marginTop: 0,
      fontSize: 'var(--text-h1)'
    }
  }, "An old faith, seen in new light"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-lg)'
    }
  }, "The Roseville New Church is a place of worship for those seeking to understand the Bible and the nature of God through the theological writings of Emanuel Swedenborg."), /*#__PURE__*/React.createElement("p", null, "We worship the Lord Jesus Christ as the one true God, in heaven and on earth. Our aim is to deepen our understanding of His love and wisdom, and to help one another lead joyful and useful lives \u2014 in the present and the hereafter."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontStyle: 'italic',
      fontSize: 22,
      lineHeight: 1.5,
      color: 'var(--rnc-violet-700)',
      borderLeft: 'none',
      margin: '36px 0',
      textAlign: 'center'
    }
  }, "\u201CLove in its essence is spiritual fire.\u201D"), /*#__PURE__*/React.createElement("p", null, "You don't need to know anything about Swedenborg to visit. Come as you are, ask anything, and stay for morning tea."), /*#__PURE__*/React.createElement(Card, {
    variant: "tint",
    title: "Come and see us",
    style: {
      marginTop: 32
    },
    footer: /*#__PURE__*/React.createElement(Button, null, "Get directions")
  }, "Sundays at 10am \xB7 4 Shirley Rd, Roseville NSW 2069 \u2014 two minutes' walk from Roseville station."));
}
window.AboutPage = AboutPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/AboutPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/EventsPage.jsx
try { (() => {
function EventsPage() {
  const NS = window.RosevilleNewChurchDesignSystem_094ee1;
  const {
    Tabs,
    Card,
    Badge,
    Button
  } = NS;
  const [tab, setTab] = React.useState('All');
  const events = [{
    t: 'Sunday worship',
    d: 'Sun 26 Jul · 10am',
    k: 'Worship',
    w: 'In person',
    desc: 'Worship, readings and reflection, followed by morning tea in the hall.'
  }, {
    t: 'Swedenborg Tuesday: open discussion',
    d: 'Tue 28 Jul · 11am',
    k: 'Study',
    w: 'On Zoom',
    desc: 'Delve a little deeper into concepts in Swedenborg\u2019s writing and relate them to our lives.'
  }, {
    t: 'Read and reflect on Swedenborg\u2019s writings',
    d: 'Wed 29 Jul · 10am',
    k: 'Study',
    w: 'On Zoom',
    desc: 'Reading slowly through one of the works of Swedenborg, reflecting as we go.'
  }, {
    t: 'Sunday worship',
    d: 'Sun 2 Aug · 10am',
    k: 'Worship',
    w: 'In person',
    desc: 'Worship, readings and reflection, followed by morning tea in the hall.'
  }, {
    t: 'Church garden working bee',
    d: 'Sat 8 Aug · 9am',
    k: 'Community',
    w: 'In person',
    desc: 'Help us care for the church garden — tools and morning tea provided.'
  }];
  const shown = events.filter(e => tab === 'All' || e.k === tab);
  return /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '56px 32px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--accent-primary)',
      marginBottom: 10
    }
  }, "\u2726 What's on"), /*#__PURE__*/React.createElement("h1", {
    style: {
      marginTop: 0,
      fontSize: 'var(--text-h1)'
    }
  }, "Upcoming events"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)',
      marginTop: -6
    }
  }, "All times are Sydney time (AEST)."), /*#__PURE__*/React.createElement(Tabs, {
    tabs: ['All', 'Worship', 'Study', 'Community'],
    active: tab,
    onChange: setTab,
    style: {
      margin: '18px 0 26px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 760
    }
  }, shown.map((e, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    interactive: true,
    eyebrow: e.d,
    title: e.t,
    footer: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: e.w === 'On Zoom' ? 'info' : 'success'
    }, e.w), e.w === 'On Zoom' && /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary"
    }, "Join Zoom"))
  }, e.desc))));
}
window.EventsPage = EventsPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/EventsPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--rnc-gradient-dusk)',
      color: 'var(--text-on-dark)',
      marginTop: 'var(--space-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '56px 32px 40px',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 22,
      letterSpacing: '.06em',
      marginBottom: 10
    }
  }, "Roseville New Church"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 15,
      color: 'rgba(246,242,251,.75)',
      maxWidth: 340
    }
  }, "A Swedenborgian community in Sydney \u2014 worshipping the Lord Jesus Christ and exploring His love and wisdom together.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      lineHeight: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 12,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--rnc-gold-300)',
      marginBottom: 8
    }
  }, "Visit"), "4 Shirley Rd, Roseville NSW 2069", /*#__PURE__*/React.createElement("br", null), "Sundays at 10am"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      lineHeight: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 12,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--rnc-gold-300)',
      marginBottom: 8
    }
  }, "Contact"), "+61 2 9416 2812", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--rnc-violet-200)'
    }
  }, "Email us"))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '0 0 28px',
      fontFamily: 'var(--font-display)',
      fontSize: 12,
      letterSpacing: '.1em',
      color: 'rgba(246,242,251,.5)'
    }
  }, "\xA9 2026 Roseville New Church \xB7 \u2726"));
}
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Header.jsx
try { (() => {
function Header({
  page,
  onNav
}) {
  const {
    Button
  } = window.RosevilleNewChurchDesignSystem_094ee1;
  const links = ['Home', 'Events', 'About'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(251,249,244,.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => onNav('Home'),
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 19,
      letterSpacing: '.06em',
      color: 'var(--rnc-violet-900)',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, "Roseville New Church"), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 6,
      marginLeft: 'auto',
      alignItems: 'center'
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav(l);
    },
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: '.03em',
      textDecoration: 'none',
      padding: '8px 14px 6px',
      borderRadius: 'var(--radius-pill)',
      color: page === l ? 'var(--accent-primary-strong)' : 'var(--text-muted)',
      background: page === l ? 'var(--rnc-violet-100)' : 'transparent'
    }
  }, l)), /*#__PURE__*/React.createElement(Button, {
    variant: "gold",
    size: "sm",
    style: {
      marginLeft: 10
    }
  }, "Plan a visit"))));
}
window.Header = Header;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomePage.jsx
try { (() => {
function HomePage({
  onNav
}) {
  const NS = window.RosevilleNewChurchDesignSystem_094ee1;
  const {
    Button,
    Card,
    Badge,
    Input
  } = NS;
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const Icon = ({
    d,
    size = 22
  }) => /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, d);
  const sun = /*#__PURE__*/React.createElement(Icon, {
    d: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 2v8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m4.93 10.93 1.41 1.41"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M2 18h2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20 18h2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m19.07 10.93-1.41 1.41"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 22H2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m8 6 4-4 4 4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 18a4 4 0 0 0-8 0"
    }))
  });
  return /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--rnc-gradient-dawn)',
      borderBottom: '1px solid var(--border-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '96px 32px 88px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--accent-primary)',
      marginBottom: 18
    }
  }, "\u2726 A Swedenborgian community in Sydney \u2726"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 auto',
      fontWeight: 300,
      fontSize: 'var(--text-hero)',
      maxWidth: 820
    }
  }, "A place to seek, question, and ", /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--rnc-gradient-aurora)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 600
    }
  }, "grow in light")), /*#__PURE__*/React.createElement("p", {
    style: {
      maxWidth: 560,
      margin: '22px auto 34px',
      fontSize: 'var(--text-lg)',
      color: 'var(--text-muted)'
    }
  }, "We explore the Bible and the nature of God through the writings of Emanuel Swedenborg \u2014 and we'd love you to join us."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg"
  }, "Join us this Sunday"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    onClick: () => onNav('About')
  }, "What we believe")))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '72px 32px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--text-h2)'
    }
  }, "This week"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNav('Events');
    },
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 15
    }
  }, "All events \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    interactive: true,
    eyebrow: "Sunday \xB7 10am",
    title: "Sunday worship",
    footer: /*#__PURE__*/React.createElement(Badge, {
      tone: "gold"
    }, "Morning tea after")
  }, "Worship, readings and reflection at 4 Shirley Rd \u2014 everyone is welcome."), /*#__PURE__*/React.createElement(Card, {
    interactive: true,
    eyebrow: "Tuesday \xB7 11am",
    title: "Open discussion",
    footer: /*#__PURE__*/React.createElement(Badge, {
      tone: "info"
    }, "On Zoom")
  }, "Delve deeper into Swedenborg's writings and relate them to our own lives."), /*#__PURE__*/React.createElement(Card, {
    interactive: true,
    eyebrow: "Wednesday \xB7 10am",
    title: "Read & reflect",
    footer: /*#__PURE__*/React.createElement(Badge, {
      tone: "info"
    }, "On Zoom")
  }, "Reading slowly through one of Swedenborg's works, together."))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '72px auto 0',
      padding: '0 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--rnc-gradient-dusk)',
      borderRadius: 'var(--radius-lg)',
      padding: '64px 48px',
      textAlign: 'center',
      color: 'var(--text-on-dark)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--rnc-gold-300)',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 14
    }
  }, sun), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 auto',
      maxWidth: 640,
      fontStyle: 'italic',
      fontSize: 26,
      lineHeight: 1.5
    }
  }, "\u201CAll religion relates to life, and the life of religion is to do good.\u201D"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      fontFamily: 'var(--font-display)',
      fontSize: 13,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'rgba(246,242,251,.6)'
    }
  }, "Emanuel Swedenborg"))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 'var(--container-max)',
      margin: '0 auto',
      padding: '72px 32px 0',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: '.22em',
      textTransform: 'uppercase',
      color: 'var(--accent-primary)',
      marginBottom: 12
    }
  }, "Newsletter"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginTop: 0,
      fontSize: 'var(--text-h2)'
    }
  }, "News from the church, every month"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "Reflections, garden updates, Swedenborg Centre news and what's coming up \u2014 straight to your inbox.")), /*#__PURE__*/React.createElement(Card, {
    variant: "tint"
  }, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 18,
      color: 'var(--status-success)',
      padding: '18px 0'
    }
  }, "\u2726 You're on the list \u2014 welcome!") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Email address",
    placeholder: "you@example.com",
    value: email,
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: () => email && setSent(true)
  }, "Subscribe")))));
}
window.HomePage = HomePage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomePage.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
