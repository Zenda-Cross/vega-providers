const extractUrlFromScript = (html: string): string => {
  const doubleAtobMatch = html.match(
    /atob\(atob\(['"]([^'"]+)['"]\)\)/,
  );
  if (doubleAtobMatch?.[1]) {
    return atob(atob(doubleAtobMatch[1]));
  }
  const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
  return (
    (plainMatch?.[1]?.split("r=")?.[1] ? atob(plainMatch[1].split("r=")[1]) : "") ||
    plainMatch?.[1] ||
    ""
  );
};

const html = `let dynamicUrl = atob(atob('YUhSMGNITTZMeTkyWTJ4dmRXUXVlbWx3TDJsd2VuSTNjbkp4TW5Jd1pteHNjRDkwYjJ0bGJqMWthM1F3VlZWcmRtUldTVFJpVnpsVVlqTmtUV1JxWnpKT2JGazFXakp3VmxScVZYZGxSWGhzVTFaUk5WSXdWa05OUm5CSVUyNVpORkZVTUQwPQ=='));`;

console.log(extractUrlFromScript(html));
