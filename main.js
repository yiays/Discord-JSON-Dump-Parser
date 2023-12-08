let dumpData = null;
let fileName = null;

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
    
function scrollToMessage(event,id) {
  const element=document.getElementById('chatlog__message-container-'+id);
  if(!element) return;
  event.preventDefault();
  element.classList.add('chatlog__message-container--highlighted');
  window.scrollTo({ top: element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - (window.innerHeight / 2), behavior: 'smooth' });
  window.setTimeout(() => element.classList.remove('chatlog__message-container--highlighted'), 2000);
}

function showSpoiler(event, element) {
  if (!element)
    return; if (element.classList.contains('chatlog__attachment--hidden')) { event.preventDefault(); element.classList.remove('chatlog__attachment--hidden'); }
  if (element.classList.contains('chatlog__markdown-spoiler--hidden')) { event.preventDefault(); element.classList.remove('chatlog__markdown-spoiler--hidden'); }
}

function renderDump(page=1) {
  document.getElementById('title').innerText = dumpData.guild.name;
  document.getElementById('channel').innerText = dumpData.channel.category + ' / ' + dumpData.channel.name;
  document.getElementById('icon').setAttribute('src', dumpData.guild.iconUrl);

  let out = '';
  let start = Math.max(dumpData.messages.length - (50 * page), 0);
  let end = start + 50;
  let pageCount = Math.ceil(dumpData.messages.length / 50);
  dumpData.messages.slice(start, end).forEach((message) => {
    out += renderMessage(message);
  });

  if(page < pageCount) {
    out = `<button class="loadmore" id="load-up" onclick="renderDump(${page + 1})">Load more</button>` + out;
  }
  if(page > 1) {
    out += `<button class="loadmore" id="load-down" onclick="renderDump(${page - 1})">Load more</button>`;
  }

  document.getElementById('chatlog').innerHTML = out;
}

function renderMessage(message) {
  let author, reply, content, attachments, embeds, stickers, reactions;
  author = dumpData.authors[message.author];

  if(message.content) {
    content = `
    <div class="chatlog__content chatlog__markdown">
      <span class="chatlog__markdown-preserve">
        ${message.content}
      </span>
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
              `;
      if(embed['author']) embeds += `<a class="chatlog__embed-author" href="${embed.author?.url}" target="_blank">${embed.author?.name}</a>`;
      embeds += `
              <a class="chatlog__embed-title" href="${embed.url}" target="_blank">${embed.title}</a>
              <span class="chatlog__embed-description">${embed.description}</span>
              `;
      if(embed['video']) {
        if(embed.video.url.toLowerCase().match(/(\.webm|\.mov|\.mp4|\.mkv)$/))
          embeds += `<video class="chatlog__embed-generic-video" muted autoplay loop src="${embed.video.url}">`;
        else
          embeds += `<iframe class="chatlog__embed-generic-video chatlog__embed-youtube" width="${embed.video.width}" height="${embed.video.height}"></iframe>`;
      }
      else if(embed['thumbnail']) embeds += `<img src="${embed.thumbnail.url}" width="${embed.thumbnail.width}" height="${embed.thumbnail.height}"`;
      embeds += `
            </div>
          </div>
        </div>`;
    })
  }

  return `
  <div class="chatlog__message-group">
    ${reply?reply:''}
    <div id="chatlog__message-container-${message.id}" class="chatlog__message-container" data-message-id="${message.id}">
      <div class="chatlog__message">
        <div class="chatlog__message-aside">
          <img class="chatlog__avatar" src="${author.avatarUrl}" alt="Avatar" loading="lazy">
        </div>
        <div class="chatlog__message-primary">
          <div class="chatlog__header">
            <span class="chatlog__author" style="color:${author.color};" title="${author.name}.${author.discriminator}" data-user-id="${author.id}">${author.nickname}</span>
            <span class="chatlog__timestamp" title="${message.timestamp}">
              <a href="#chatlog__message-container-${message.id}">${message.timestamp}</a>
            </span>
          </div>
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
    // Consolidate authors
    if("roles" in dumpData.messages[i].author) delete dumpData.messages[i].author.roles;
    let authorid = dumpData.messages[i].author.id;
    if(!(authorid in dumpData.authors)) {
      dumpData.authors[authorid] = {...dumpData.messages[i].author};
    }
    dumpData.messages[i].author = authorid;

    // Remove fields which are empty or unused
    if("callEndedTimestamp" in dumpData.messages[i]) delete dumpData.messages[i].callEndedTimestamp;
    if('attachments' in dumpData.messages[i] && dumpData.messages[i].attachments.length == 0) delete dumpData.messages[i].attachments;
    if('embeds' in dumpData.messages[i] && dumpData.messages[i].embeds.length == 0) delete dumpData.messages[i].embeds;
    if('stickers' in dumpData.messages[i] && dumpData.messages[i].stickers.length == 0) delete dumpData.messages[i].stickers;
    if('reactions' in dumpData.messages[i] && dumpData.messages[i].reactions.length == 0) delete dumpData.messages[i].reactions;
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