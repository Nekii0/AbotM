// Cards are looked up on each search so services added by admins are included.
document.getElementById('q').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('.card').forEach(c => { const hit = c.textContent.toLowerCase().includes(q); c.hidden = !hit; shown += hit; });
  document.getElementById('empty').style.display = shown ? 'none' : 'block';
});
