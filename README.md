# Discord JSON Dump Parser

This project makes browsing dumps of Discord servers created by Tyrezzz's [Discord Chat Exporter](https://github.com/Tyrrrz/DiscordChatExporter/) much easier, with a drastically improved browsing experience. I have added pagination and memory footprint optimization techniques to make large backups perform better in the browser.

In the future, I would also like to add media backups and search.

## Feature roadmap

- [x] Loading and exporting JSON text channel data
- [x] Large exports are paginated for performance
- [x] Support for Discord features
  - [x] Nicknames, profile pictures, role colours
  - [x] Attachments / Media
  - [x] Embeds
  - [x] Reactions
  - [x] Replies
  - [x] Markdown formatting
  - [x] Mentions
  - [ ] Pinned messages
  - [ ] Emoijs in chat (may not be possible)
  - [ ] Stickers (low priority, system stickers may not be possible)
  - [ ] System messages (low priority)
- [ ] Backing up media
- [ ] Whole server browsing by combining channel dumps

## Usage

Simply create a backup of any channel in JSON mode using [Discord Chat Exporter](https://github.com/Tyrrrz/DiscordChatExporter/). Then open the JSON file in my project - [Discord JSON Dump Parser](https://yiays.github.io/Discord-JSON-Dump-Parser). This will render the chat history like it's still in Discord, and also compress the JSON file for sharing if you press *Export compressed dump*.

## Notes

Other dumps/backups/exports created by other tools may also work, though this hasn't been tested.

Discord is changing their CDN policy, soon, links to media in projects like this will expire if not regularly backed up. I hope to find a fix for this, but it will innevitably cost quite a bit of storage.