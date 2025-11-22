 document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      let answer = btn.nextElementSibling;
      let icon = btn.querySelector('.faq-icon');

      // Toggle current block
      btn.classList.toggle('active');

      if (answer.style.maxHeight) {
        answer.style.maxHeight = null;
        icon.textContent = "+";
      } else {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.textContent = "-";
      }

      // Close all others
      document.querySelectorAll('.faq-answer').forEach((item) => {
        if (item !== answer) {
          item.style.maxHeight = null;
        }
      });

      document.querySelectorAll('.faq-question').forEach((q) => {
        if (q !== btn) {
          q.classList.remove('active');
          q.querySelector('.faq-icon').textContent = "+";
        }
      });
    });
  });