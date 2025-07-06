Build a service management assistant AI agent with the following specifications:

**Core Capabilities (5 key features):**
1. **Planning**: Decompose user missions into executable step-by-step plans
2. **Tool Use**: Access and utilize a predefined set of tools to execute tasks
3. **Autonomous Execution**: Execute plans independently without requiring constant user intervention
4. **Reflective Learning**: Continuously assess progress, identify issues, and dynamically improve plans during execution
5. **Goal-Oriented Behavior**: Maintain focus on the original mission objective and ensure all actions contribute to goal completion

**Technical Requirements:**
- **AI Framework**: LlamaIndex.js for document processing and retrieval
- **AI Models**: DeepSeek reasoning model for planning and decision-making, DeepSeek embedding model for semantic search
- **Frontend**: Modern web UI using Next.js 14 with TypeScript, Tailwind CSS, and a component library like Shadcn/ui
- **Backend**: Node.js with TypeScript and Express.js/Fastify
- **Database**: SQLite3 for structured data storage (plans, tasks, execution logs)
- **ORM**: Drizzle ORM for database operations
- **Caching**: Node.js native caching library (node-cache or similar) for session management and performance optimization
- **Vector Storage**: Embedded vector database or file-based solution for embeddings

**Specific Features:**
- **Confluence Integration**: Load Confluence pages via provided URLs, index content using embeddings
- **Natural Language Retrieval**: Allow users to query Confluence content using natural language
- **Source Attribution**: Display retrieved content with clear source references and links back to original Confluence pages
- **Real-time Updates**: Show live progress of plan execution and task completion
- **Plan Visualization**: Display current plan, completed steps, and upcoming tasks in an intuitive interface

**Implementation Approach:**
1. Start with technical analysis and architecture design
2. Set up project structure with modern web framework
3. Implement core agent framework with the 5 capabilities
4. Build tool system including Confluence integration
5. Create the web UI for mission input, plan visualization, and content display
6. Integrate and test all components end-to-end

**Deliverables:**
- A working web application where users can input missions
- An AI agent that creates and executes plans autonomously
- Confluence content retrieval and display functionality
- Real-time progress tracking and plan adaptation capabilities