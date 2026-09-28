# Tick MCP Server Reference for AI Agents

This document is the official specification for AI agents, assistants, and frameworks communicating with **Tick** exclusively through the **Model Context Protocol (MCP)**.

---

## 1. Overview

The Tick MCP Server allows your AI agent to discover and invoke tools to manage chores, tasks, and family members in real-time. 

- **Protocol Version**: `2024-11-05`
- **Transport**: HTTP with Server-Sent Events (SSE) & Streamable HTTP JSON-RPC 2.0
- **Production SSE Endpoint**: 
  ```text
  https://tick-api.bejeranos.workers.dev/api/mcp/sse?apiKey=tick_live_YOUR_KEY
  ```
- **Direct JSON-RPC Endpoint**:
  ```text
  https://tick-api.bejeranos.workers.dev/api/mcp
  ```
  *(Requires `Authorization: Bearer tick_live_YOUR_KEY` header)*

---

## 2. Authentication

Your agent authenticates using a Personal Access Token (`tick_live_...`).

### How to Obtain an API Key
1. In the Tick Web App (`https://5e3b56c9.beje-tick.pages.dev`), sign in with Google or Email.
2. Tap the Tick icon at the top left to open the menu.
3. Select **"AI Agent API Keys"** (`מפתחות API לסוכני AI`).
4. Click **"Create New Key"**, enter a name (e.g., `Claude Agent`), and copy the key.

The key automatically identifies your user account and active family group.

---

## 3. Client Configuration

### 3.1 Claude Desktop
Add Tick to your `claude_desktop_config.json`:

* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tick": {
      "url": "https://tick-api.bejeranos.workers.dev/api/mcp/sse?apiKey=tick_live_YOUR_API_KEY_HERE"
    }
  }
}
```

*(If using an MCP stdio proxy like `mcp-remote`):*

```json
{
  "mcpServers": {
    "tick": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://tick-api.bejeranos.workers.dev/api/mcp/sse?apiKey=tick_live_YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

---

### 3.2 Cursor IDE
Add to your Cursor MCP settings (`Settings -> Features -> MCP` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "tick": {
      "url": "https://tick-api.bejeranos.workers.dev/api/mcp/sse?apiKey=tick_live_YOUR_API_KEY_HERE"
    }
  }
}
```

---

### 3.3 Python (Official `mcp` SDK)

```python
import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client

TICK_API_KEY = "tick_live_YOUR_API_KEY_HERE"
SERVER_URL = f"https://tick-api.bejeranos.workers.dev/api/mcp/sse?apiKey={TICK_API_KEY}"

async def main():
    async with sse_client(SERVER_URL) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            # 1. Discover available tools
            tools = await session.list_tools()
            print("Connected to Tick! Available tools:", [t.name for t in tools.tools])

            # 2. Get family members
            members = await session.call_tool("get_family_members", {})
            print("Family members:", members.content[0].text)

            # 3. List open tasks
            tasks = await session.call_tool("list_tasks", {"status": "pending"})
            print("Pending chores:", tasks.content[0].text)

            # 4. Create a chore
            new_chore = await session.call_tool("create_task", {
                "title": "Unload dishwasher",
                "priority": "medium"
            })
            print("Chore created:", new_chore.content[0].text)

if __name__ == "__main__":
    asyncio.run(main())
```

---

### 3.4 TypeScript / Node.js (Official `@modelcontextprotocol/sdk`)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const TICK_API_KEY = "tick_live_YOUR_API_KEY_HERE";
const url = new URL(`https://tick-api.bejeranos.workers.dev/api/mcp/sse?apiKey=${TICK_API_KEY}`);

async function run() {
  const transport = new SSEClientTransport(url);
  const client = new Client({ name: "my-tick-agent", version: "1.0.0" }, { capabilities: {} });

  await client.connect(transport);

  // List tools
  const tools = await client.listTools();
  console.log("Tick tools:", tools.tools.map(t => t.name));

  // Call list_tasks
  const result = await client.callTool({
    name: "list_tasks",
    arguments: { status: "pending" },
  });
  console.log("Tasks:", result);
}

run();
```

---

## 4. MCP Tools Catalog

The Tick MCP server provides the following 7 tools:

### 1. `get_family_members`
Retrieves all family or team members in the user's active group, including names and user IDs.
- **Input Parameters**: *(none)*
- **Returns**: Array of user objects (`id`, `name`, `email`, `role`).
- **Agent Usage Tip**: Always call this tool first when a user asks to assign a chore to someone by name (e.g., *"Assign taking out the trash to Sarah"*), so you can look up Sarah's `id`.

---

### 2. `list_tasks`
Retrieves chores and tasks for the group with optional filtering.
- **Input Parameters**:
  - `status` *(optional, string)*: Filter by status: `"pending"`, `"in_progress"`, `"completed"`, `"cancelled"`.
  - `priority` *(optional, string)*: Filter by priority: `"low"`, `"medium"`, `"high"`, `"urgent"`.
  - `assignee_id` *(optional, string)*: Filter by assigned member's user ID.
  - `all_groups` *(optional, boolean)*: Set to `true` to search across all family groups the user belongs to.
- **Returns**: Array of tasks with `id`, `title`, `description`, `status`, `priority`, `due_at`, `assignee_id`, `assignee_name`, and `recurrence_rule`.

---

### 3. `create_task`
Creates a new chore or family task.
- **Input Parameters**:
  - `title` *(required, string)*: Title of the chore (e.g. *"Feed the dog"*).
  - `description` *(optional, string)*: Additional instructions, notes, or checklist details.
  - `priority` *(optional, string)*: `"low"`, `"medium"`, `"high"`, `"urgent"` (default: `"medium"`).
  - `assignee_id` *(optional, string)*: User ID of the assignee. If omitted, the task is marked as **"Open to anyone"**.
  - `due_at` *(optional, integer)*: Due timestamp in Unix seconds (e.g. `1774910000`).
  - `recurrence_rule` *(optional, string)*: Repeating schedule: `"daily"`, `"weekly"`, or `"monthly"`.
- **Side Effect**: Automatically sends an immediate **Web Push Notification** to the assigned family member's phone and browser! If assigned to "anyone", all family members receive an open chore alert.

---

### 4. `complete_task`
Marks a task as completed.
- **Input Parameters**:
  - `task_id` *(required, string)*: The UUID of the task.
- **Recurrence Handling**: If the task has a `recurrence_rule` (e.g., `"daily"`), Tick marks the current task completed and **automatically creates the next scheduled occurrence**!
- **Side Effect**: Sends a push notification to the task creator informing them the chore was completed.

---

### 5. `update_task`
Modifies attributes of an existing chore.
- **Input Parameters**:
  - `task_id` *(required, string)*: The UUID of the task to update.
  - `title` *(optional, string)*: New title.
  - `description` *(optional, string)*: New notes or checklist.
  - `priority` *(optional, string)*: `"low"`, `"medium"`, `"high"`, `"urgent"`.
  - `assignee_id` *(optional, string)*: Reassign to a different family member.
  - `due_at` *(optional, integer)*: Reschedule due timestamp in Unix seconds.
  - `status` *(optional, string)*: `"pending"`, `"in_progress"`, `"completed"`, `"cancelled"`.

---

### 6. `delete_task`
Permanently deletes a chore.
- **Input Parameters**:
  - `task_id` *(required, string)*: The UUID of the task to delete.

---

### 7. `nudge_assignee`
Sends an instant reminder notification to the assigned family member.
- **Input Parameters**:
  - `task_id` *(required, string)*: The UUID of the task.
- **Side Effect**: Sends a Web Push alert to the assignee saying: `"[User] nudged you regarding: [Task Title]"`.

---

## 5. Agent Workflow Guidelines

When prompting or programming your agent, instruct it with these best practices:

1. **Member Resolution**:
   - If the user says: *"Assign buying groceries to Dad"*, call `get_family_members`, find the member whose name matches "Dad" or the user's father, and pass their `id` into `create_task`.
2. **Open Tasks vs Completed**:
   - Default to calling `list_tasks(status="pending")` when users ask *"What do I need to do?"* or *"What chores are left today?"*.
3. **Recurring Chores**:
   - Daily chores (like *"Walk the dog"*, *"Brush teeth"*, *"Dishes"*) should be created with `recurrence_rule="daily"`. When completed via `complete_task`, Tick will automatically advance the chore to tomorrow.
4. **Reminders & Nudges**:
   - If a user asks to remind someone about an overdue task, call `nudge_assignee(task_id=...)`.

---

## 6. Testing the MCP Server Directly (JSON-RPC)

You can verify the MCP server connection from your terminal using `curl`:

### Step 1: Initialize Session
```bash
curl -X POST "https://tick-api.bejeranos.workers.dev/api/mcp" \
  -H "Authorization: Bearer tick_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "test-agent", "version": "1.0" }
    }
  }'
```

### Step 2: List Available Tools
```bash
curl -X POST "https://tick-api.bejeranos.workers.dev/api/mcp" \
  -H "Authorization: Bearer tick_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Step 3: Invoke `list_tasks`
```bash
curl -X POST "https://tick-api.bejeranos.workers.dev/api/mcp" \
  -H "Authorization: Bearer tick_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "list_tasks",
      "arguments": { "status": "pending" }
    }
  }'
```
