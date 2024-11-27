const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Path to JSON database
const DB_PATH = path.join(__dirname, 'db.json');

// Predefined priorities and categories
const PRIORITIES = ['low', 'medium', 'high'];
const CATEGORIES = ['work', 'personal', 'shopping', 'health'];

// Helper function to read database
async function readDatabase() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty todos
    return { todos: [] };
  }
}

// Helper function to write to database
async function writeDatabase(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Validation middleware
function validateTodo(req, res, next) {
  const { text, priority, category, completed } = req.body;

  // Check required fields
  if (!text) {
    return res.status(400).json({ error: 'Todo text is required' });
  }

  // Validate priority
  if (priority && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ 
      error: `Invalid priority. Must be one of: ${PRIORITIES.join(', ')}` 
    });
  }

  // Validate category
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ 
      error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` 
    });
  }

  next();
}

// GET all todos
app.get('/todos', async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db.todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read todos' });
  }
});

// POST new todo
app.post('/todos', validateTodo, async (req, res) => {
  try {
    const db = await readDatabase();
    const newTodo = {
      id: Date.now(),
      text: req.body.text,
      completed: req.body.completed || false,
      priority: req.body.priority || 'medium',
      category: req.body.category || 'personal',
      createdAt: new Date().toISOString()
    };
    db.todos.push(newTodo);
    await writeDatabase(db);
    res.status(201).json(newTodo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add todo' });
  }
});

// PUT update todo
app.put('/todos/:id', validateTodo, async (req, res) => {
  try {
    const db = await readDatabase();
    const index = db.todos.findIndex(todo => todo.id === parseInt(req.params.id));
    
    if (index > -1) {
      // Merge existing todo with update
      db.todos[index] = {
        ...db.todos[index],
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      await writeDatabase(db);
      res.json(db.todos[index]);
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE todo
app.delete('/todos/:id', async (req, res) => {
  try {
    const db = await readDatabase();
    const filteredTodos = db.todos.filter(todo => todo.id !== parseInt(req.params.id));
    db.todos = filteredTodos;
    await writeDatabase(db);
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// GET available priorities and categories
app.get('/metadata', (req, res) => {
  res.json({
    priorities: PRIORITIES,
    categories: CATEGORIES
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});