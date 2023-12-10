let dumpData = null;
let fileName = null;
const timeFormat = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.chatlog__markdown-pre--multiline').forEach(e => hljs.highlightBlock(e));

  document.querySelectorAll('.chatlog__sticker--media[data-source]').forEach(e=>{
    const anim=lottie.loadAnimation({
      container:e,
      renderer:'svg',
      loop:true,
      autoplay:true,
      path:e.getAttribute('data-source')
    });
    
    anim.addEventListener('data_failed',()=>e.innerHTML='<strong>[Sticker cannot be rendered]</strong>');
  });

  document.getElementById('jsonfile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    fileName = file.name;

    if(file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        dumpData = JSON.parse(e.target.result);
        optimizeDump();
        renderDump();
      }

      reader.readAsText(file);
    }
  });
});
    
function scrollToMessage(id) {
  let element=document.getElementById('chatlog__message-container-'+id);
  if(!element) {
    // Search other pages for message
    let pos = dumpData.messages.findIndex((msg) => msg.id == id);
    if(pos >= 0) {
      renderDump(Math.ceil(pos/50));
      element=document.getElementById('chatlog__message-container-'+id);
    }
    else return false;
  }
  element.classList.add('chatlog__message-container--highlighted');
  setTimeout(() => {
    window.scrollTo({ top: element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - (window.innerHeight / 2), behavior: 'smooth' });
    window.setTimeout(() => element.classList.remove('chatlog__message-container--highlighted'), 2000);
  }, 500);
  return true;
}

function showSpoiler(event, element) {
  if (!element)
    return; if (element.classList.contains('chatlog__attachment--hidden')) { event.preventDefault(); element.classList.remove('chatlog__attachment--hidden'); }
  if (element.classList.contains('chatlog__markdown-spoiler--hidden')) { event.preventDefault(); element.classList.remove('chatlog__markdown-spoiler--hidden'); }
}

function renderDump(page=-1) {
  document.getElementById('title').innerText = dumpData.guild.name;
  document.getElementById('channel').innerText = dumpData.channel.category + ' / ' + dumpData.channel.name;
  document.getElementById('icon').setAttribute('src', dumpData.guild.iconUrl);

  let out = '';

  // Page tracking logic
  let pageCount = Math.ceil(dumpData.messages.length / 50);
  if(page == -1) page = pageCount;
  let start = Math.max(50 * (page - 1), 0);
  let end = start + 50;

  let previousAuthor = 0;
  dumpData.messages.slice(start, end).forEach((message) => {
    out += renderMessage(message, previousAuthor == message.author);
    previousAuthor = message.author;
  });

  if(page > 1) {
    out = `<button class="loadmore" id="load-up" onclick="renderDump(${page - 1});scrollToMessage('${dumpData.messages[start - 1].id}')">Load more</button>` +
      `&nbsp;Page ${page} of ${pageCount}&nbsp;` +
      `<button class="loadmore" id="load-start" onclick="renderDump(1);scrollToMessage('${dumpData.messages[0].id}')">Jump to start</button>` + out;
  }
  if(page < pageCount) {
    out += `<button class="loadmore" id="load-down" onclick="renderDump(${page + 1});scrollToMessage('${dumpData.messages[end].id}')">Load more</button>` +
      `&nbsp;Page ${page} of ${pageCount}&nbsp;` +
      `<button class="loadmore" id="load-start" onclick="renderDump(${pageCount});scrollToMessage('${dumpData.messages[dumpData.messages.length - 1].id}')">Jump to end</button>`;
  }

  document.getElementById('chatlog').innerHTML = out;
}

function renderMessage(message, skipAuthor=false) {
  let pfp, usertag, reply, content, attachments, embeds, stickers, reactions;
  let author = dumpData.authors[message.author];

  if(message['reference']) {
    let replyMessage = dumpData.messages.find((i) => i.id == message.reference.messageId);
    if(replyMessage !== -1) {
      let replyAuthor = dumpData.authors[replyMessage.author];
      reply = `
      <div class="chatlog__reply">
        <img class="chatlog__reply-avatar" src="${replyAuthor.avatarUrl}" alt="Avatar" loading="lazy">
        <div class="chatlog__reply-author" title="${replyAuthor.name}#${replyAuthor.discriminator}">${replyAuthor.nickname}</div>
        <div class="chatlog__reply-content">
          <span class="chatlog__reply-link" onclick="scrollToMessage(event,'${message.reference.messageId}')">
            <em>Click to see original message</em>
          </span>
        </div>
      </div>`;
    }
  }

  if(!skipAuthor || reply) {
    pfp = `<img class="chatlog__avatar" src="${author.avatarUrl}" alt="Avatar" loading="lazy">`;
    if(reply) pfp = `<div class="chatlog__reply-symbol"></div>` + pfp;
    let parseDate = new Date(Date.parse(message.timestamp));
    usertag = `
    <div class="chatlog__header">
      <span class="chatlog__author" style="color:${author.color};" title="${author.name}#${author.discriminator}" data-user-id="${author.id}">${author.nickname}</span>
      <span class="chatlog__timestamp" title="${message.timestamp}">
        <a href="#chatlog__message-container-${message.id}">${parseDate.toLocaleString(undefined, timeFormat).replace(' am', 'am').replace(' pm', 'pm')}</a>
      </span>
    </div>`;
  }

  if(message.content) {
    content = `
    <div class="chatlog__content chatlog__markdown">
      <span class="chatlog__markdown-preserve">${message.content}</span>
    </div>`
  }

  if(message['attachments']) {
    attachments = '';
    message.attachments.forEach((attachment) => {
      attachments += '<div class="chatlog__attachment">'
      if(attachment.fileName.toLowerCase().match(/(\.png|\.jpg|\.webp|\.gif|\.jpeg)$/)) {
        attachments += `<img class="chatlog__attachment-media" src="${attachment.url}">`;
      }
      else if(attachment.fileName.toLowerCase().match(/(\.webm|\.mov|\.mp4|\.mkv)$/)) {
        attachments += `<video class="chatlog__attachment-media" controls src="${attachment.url}">`;
      }
      attachments += "</div>"
    });
  }

  if(message['embeds']) {
    embeds = '';
    message.embeds.forEach((embed) => {
      embeds += `
        <div class="chatlog__embed">
          <div class="chatlog__embed-color-pill" style="background:${embed.color}"></div>
          <div class="chatlog__embed-content-container">
            <div class="chatlog__embed-content">
              <div class="chatlog__embed-text">
                `;
      if(embed['author']) embeds += `<div class="chatlog__embed-author-container">
                <a class="chatlog__embed-author-link" href="${embed.author.url}" target="_blank">${embed.author.name}</a>
              </div>`;
      embeds += `<div class="chatlog__embed-title">
                <a class="chatlog__embed-title-link" href="${embed.url}" target="_blank">${embed.title}</a>
              </div>
              <span class="chatlog__embed-description">${embed.description}</span>
              `;
      if(embed['video']) {
        embeds += '<div class="chatlog__embed-youtube-container">';
        if(embed.video.url.toLowerCase().match(/(\.webm|\.mov|\.mp4|\.mkv)$/))
          embeds += `<video class="chatlog__embed-generic-video" muted autoplay loop src="${embed.video.url}">`;
        else
          embeds += `<iframe class="chatlog__embed-generic-video chatlog__embed-youtube" src="${embed.video.url}" width="400" height="255"></iframe>`;
        embeds += '</div>'
      }
      else if(embed['thumbnail']) embeds += `<img src="${embed.thumbnail.url}" width="${embed.thumbnail.width}" height="${embed.thumbnail.height}"`;
      embeds += `
            </div>
          </div>
        </div>`;
    })
  }

  if(message['stickers']) stickers = '[Stickers]';

  if(message['reactions']) {
    reactions = `<div class="chatlog__reactions">`
    message.reactions.forEach((react) => {
      reactions += `<div class="chatlog__reaction" title="${react.emoji.code}">
        <img class="chatlog__emoji chatlog__emoji--small" alt="${react.emoji.name}" src="${react.emoji.imageUrl}" loading="lazy">
        <span class="chatlog__reaction-count">${react.count}</span>
      </div>`;
    })
    reactions += `</div>`
  }

  if(message['mentions']) mentions = '[Mentions]';

  return `
  <div class="chatlog__message-group">
    <div id="chatlog__message-container-${message.id}" class="chatlog__message-container" data-message-id="${message.id}">
      <div class="chatlog__message">
        <div class="chatlog__message-aside">
          ${pfp?pfp:''}
        </div>
        <div class="chatlog__message-primary">
          ${reply?reply:''}
          ${usertag?usertag:''}
          ${content?content:''}
          ${attachments?attachments:''}
          ${embeds?embeds:''}
          ${stickers?stickers:''}
          ${reactions?reactions:''}
        </div>
      </div>
    </div>
  </div>`;
}

function optimizeDump() {
  // Reduces memory footprint of the chat history dump by removing unessecary information
  //console.log("Before: ", JSON.stringify(dumpData, null, 0).length);

  // Prepare to store new fields
  if(!('authors' in  dumpData)) dumpData.authors = {};

  for(let i = 0; i < dumpData.messages.length; i++) {
    // Consolidate message authors
    if(typeof(dumpData.messages[i].author) == 'object') {
      if("roles" in dumpData.messages[i].author) delete dumpData.messages[i].author.roles;
      let authorid = dumpData.messages[i].author.id;
      if(!(authorid in dumpData.authors)) {
        dumpData.authors[authorid] = {...dumpData.messages[i].author};
      }
      dumpData.messages[i].author = authorid;
    }

    // Remove fields which are empty or unused
    if("callEndedTimestamp" in dumpData.messages[i]) delete dumpData.messages[i].callEndedTimestamp;
    if('attachments' in dumpData.messages[i] && dumpData.messages[i].attachments.length == 0) delete dumpData.messages[i].attachments;
    if('embeds' in dumpData.messages[i] && dumpData.messages[i].embeds.length == 0) delete dumpData.messages[i].embeds;
    if('stickers' in dumpData.messages[i] && dumpData.messages[i].stickers.length == 0) delete dumpData.messages[i].stickers;
    if('reactions' in dumpData.messages[i]) {
      if (dumpData.messages[i].reactions.length == 0) delete dumpData.messages[i].reactions;
      else {
        // Consolidate reaction users
        for(let j = 0; j < dumpData.messages[i].reactions.length; j++) {
          if(dumpData.messages[i].reactions[j].users.length && typeof(dumpData.messages[i].reactions[j].users[0]) == 'object') {
            for(let k = 0; k < dumpData.messages[i].reactions[j].users.length; k++) {
              let authorid = dumpData.messages[i].reactions[j].users[k].id;
              if(!(authorid in dumpData.authors)) {
                dumpData.authors[authorid] = {...dumpData.messages[i].reactions[j].users[k]};
              }
              dumpData.messages[i].reactions[j].users[k] = authorid;
            }
          }
        }
      }
    }
    if('mentions' in dumpData.messages[i] && dumpData.messages[i].mentions.length == 0) delete dumpData.messages[i].mentions;
  }
  //console.log("After: ", JSON.stringify(dumpData, null, 0).length);
}

function writeDump() {
  if(dumpData === null) {
    alert("No data to export!");
    return;
  }
  const blob = new Blob([JSON.stringify(dumpData, null, 0)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName?.replace('.json', '.min.json') || 'export.min.json';
  link.click();
}