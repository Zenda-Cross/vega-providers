const html = `let dynamicUrl = atob(atob('YUhSMGNITTZMeTkyWTJ4dmRXUXVlbWx3TDJsd2VuSTNjbkp4TW5Jd1pteHNjRDkwYjJ0bGJqMWthM1F3VlZWcmRtUldTVFJpVnpsVVlqTmtUV1JxWnpKT2JGazFXakp3VmxScVZYZGxSWGhzVTFaUk5WSXdWa05OUm5CSVUyNVpORkZVTUQwPQ=='));`;
const doubleAtobMatch = html.match(/atob\(atob\(['"]([^'"]+)['"]\)\)/);
if (doubleAtobMatch?.[1]) {
  console.log(atob(atob(doubleAtobMatch[1])));
}
