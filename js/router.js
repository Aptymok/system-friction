(function () {
  const path = window.location.pathname;

  let profile = "explorer";

  if (path.includes("simulation")) profile = "technical";
  if (path.includes("sistema")) profile = "executive";
  if (path.includes("mop-h")) profile = "engaged";

  localStorage.setItem("sf_profile", profile);

  console.log("[SF] Profile detected:", profile);
})();